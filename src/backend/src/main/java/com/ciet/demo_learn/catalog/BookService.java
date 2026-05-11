package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.book.Book;
import com.ciet.demo_learn.book.BookImage;
import com.ciet.demo_learn.book.BookStock;
import com.ciet.demo_learn.book.PriceHistory;
import com.ciet.demo_learn.branch.Branch;
import com.ciet.demo_learn.branch.BranchRepository;
import com.ciet.demo_learn.purchase.UsedBookPurchaseItem;
import com.ciet.demo_learn.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional
public class BookService {

    private static final Pattern ISBN_10 = Pattern.compile("^\\d{9}[\\dX]$");
    private static final Pattern ISBN_13 = Pattern.compile("^97[89]\\d{10}$");

    private final BookRepository bookRepo;
    private final BookStockRepository stockRepo;
    private final BookImageRepository imageRepo;
    private final PriceHistoryRepository priceHistoryRepo;
    private final UsedBookPurchaseRepository purchaseRepo;
    private final UsedBookPurchaseItemRepository purchaseItemRepo;
    private final BranchRepository branchRepo;
    private final StorageService storageService;
    private final BookNotificationService notificationService;

    public BookService(BookRepository bookRepo,
                       BookStockRepository stockRepo,
                       BookImageRepository imageRepo,
                       PriceHistoryRepository priceHistoryRepo,
                       UsedBookPurchaseRepository purchaseRepo,
                       UsedBookPurchaseItemRepository purchaseItemRepo,
                       BranchRepository branchRepo,
                       StorageService storageService,
                       BookNotificationService notificationService) {
        this.bookRepo = bookRepo;
        this.stockRepo = stockRepo;
        this.imageRepo = imageRepo;
        this.priceHistoryRepo = priceHistoryRepo;
        this.purchaseRepo = purchaseRepo;
        this.purchaseItemRepo = purchaseItemRepo;
        this.branchRepo = branchRepo;
        this.storageService = storageService;
        this.notificationService = notificationService;
    }

    public BookResponse createBook(BookCreateRequest req, UUID branchId, UUID userId) {
        validateCondition(req.condition());
        if ("used".equals(req.condition()) && isBlank(req.conditionDescription())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "conditionDescription obrigatório para livro usado.");
        }
        if ("new".equals(req.condition()) && (req.quantity() == null || req.quantity() < 1)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "quantity obrigatório (mínimo 1) para livro novo.");
        }
        validateIsbn(req.isbn());
        validateYear(req.year());

        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filial não encontrada."));

        if (req.lotId() != null) {
            purchaseRepo.findByIdAndBranchId(req.lotId(), branchId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lote não encontrado na filial."));
        }

        Book book = new Book();
        book.setTitle(req.title());
        book.setAuthor(req.author());
        book.setIsbn(req.isbn());
        book.setPublisher(req.publisher());
        book.setYear(req.year());
        book.setCategory(req.category());
        book.setCondition(req.condition());
        book.setConditionDescription(req.conditionDescription());
        book.setSalePrice(req.salePrice());
        book.setDescription(req.description());
        book.setShelfLocation(req.shelfLocation());
        book.setBranch(branch);
        book.setActive(true);
        book = bookRepo.save(book);

        int qty = "used".equals(req.condition()) ? 1 : req.quantity();
        BookStock stock = new BookStock();
        stock.setBook(book);
        stock.setBranch(branch);
        stock.setQuantity(qty);
        stockRepo.save(stock);

        if (req.lotId() != null) {
            var purchase = purchaseRepo.findById(req.lotId()).orElseThrow();
            UsedBookPurchaseItem item = new UsedBookPurchaseItem();
            item.setPurchase(purchase);
            item.setBook(book);
            purchaseItemRepo.save(item);
        }

        final UUID savedBookId = book.getId();
        final String title = book.getTitle();
        final String author = book.getAuthor();
        final String isbn = book.getIsbn();
        notificationService.notifyWishlistMatches(savedBookId, branchId, title, author, isbn);

        return toBookResponse(book, qty, List.of());
    }

    public BookResponse updateBook(UUID bookId, BookUpdateRequest req, UUID branchId, UUID userId) {
        Book book = bookRepo.findByIdAndBranchId(bookId, branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livro não encontrado."));

        if ("used".equals(book.getCondition()) && isBlank(req.conditionDescription())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "conditionDescription obrigatório para livro usado.");
        }
        validateIsbn(req.isbn());
        validateYear(req.year());

        if (req.salePrice().compareTo(book.getSalePrice()) != 0) {
            PriceHistory history = new PriceHistory();
            history.setBook(book);
            history.setPreviousPrice(book.getSalePrice());
            history.setNewPrice(req.salePrice());
            User changedBy = new User();
            changedBy.setId(userId);
            history.setChangedBy(changedBy);
            priceHistoryRepo.save(history);
        }

        bookRepo.updateBook(
                bookId,
                req.title(), req.author(), req.isbn(), req.publisher(), req.year(),
                req.category(), req.conditionDescription(), req.salePrice(),
                req.description(), req.shelfLocation());

        if ("new".equals(book.getCondition()) && req.quantity() != null && req.quantity() >= 0) {
            stockRepo.updateQuantity(bookId, req.quantity());
        }

        book = bookRepo.findByIdAndBranchId(bookId, branchId).orElseThrow();
        int qty = stockRepo.findByBookIdAndBranchId(bookId, branchId).map(BookStock::getQuantity).orElse(0);
        List<ImageResponse> images = imageRepo.findByBookIdOrderByOrderAsc(bookId)
                .stream().map(this::toImageResponse).toList();
        return toBookResponse(book, qty, images);
    }

    @Transactional(readOnly = true)
    public BookResponse getBook(UUID bookId, UUID branchId) {
        Book book = bookRepo.findByIdAndBranchId(bookId, branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livro não encontrado."));
        int qty = stockRepo.findByBookIdAndBranchId(bookId, branchId).map(BookStock::getQuantity).orElse(0);
        List<ImageResponse> images = imageRepo.findByBookIdOrderByOrderAsc(bookId)
                .stream().map(this::toImageResponse).toList();
        return toBookResponse(book, qty, images);
    }

    @Transactional(readOnly = true)
    public BookPageResponse listBooks(UUID branchId, String condition, String category,
                                      BigDecimal minPrice, BigDecimal maxPrice,
                                      String sort, String direction, int page, int size) {
        validateSortField(sort);
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortCol = mapSortField(sort);
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(dir, sortCol));

        Page<BookSummaryProjection> raw = bookRepo.listBooksRaw(branchId,
                isBlank(condition) ? null : condition,
                isBlank(category) ? null : category,
                minPrice, maxPrice, pageable);

        return toPageResponse(raw);
    }

    @Transactional(readOnly = true)
    public BookPageResponse searchBooks(UUID branchId, String q, int page, int size) {
        if (isBlank(q)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parâmetro 'q' obrigatório.");
        }
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));
        Page<BookSummaryProjection> raw = bookRepo.searchBooksRaw(branchId, q, pageable);
        return toPageResponse(raw);
    }

    @Transactional(readOnly = true)
    public IsbnPrefillResponse getIsbnPrefill(String isbn) {
        if (isBlank(isbn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parâmetro 'isbn' obrigatório.");
        }
        Book book = bookRepo.findTopByIsbnActive(isbn)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ISBN não encontrado no catálogo."));
        return new IsbnPrefillResponse(book.getTitle(), book.getAuthor(), book.getPublisher(), book.getYear(), book.getCategory());
    }

    public ImageUploadResponse uploadImage(UUID bookId, MultipartFile file, UUID branchId) {
        bookRepo.findByIdAndBranchId(bookId, branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livro não encontrado."));

        long count = imageRepo.countByBookId(bookId);
        if (count >= 10) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Limite de 10 imagens atingido.");
        }

        int order = imageRepo.findMaxOrderByBookId(bookId).map(m -> m + 1).orElse(0);
        String url = storageService.store(file, bookId);

        BookImage image = new BookImage();
        Book bookRef = new Book();
        bookRef.setId(bookId);
        image.setBook(bookRef);
        image.setUrl(url);
        image.setOrder(order);
        image = imageRepo.save(image);

        return new ImageUploadResponse(image.getId(), image.getUrl(), image.getOrder());
    }

    public List<ImageResponse> reorderImages(UUID bookId, ImageReorderRequest req, UUID branchId) {
        bookRepo.findByIdAndBranchId(bookId, branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livro não encontrado."));

        for (ImageOrderItem item : req.order()) {
            BookImage img = imageRepo.findByIdAndBookId(item.imageId(), bookId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Imagem " + item.imageId() + " não pertence a este livro."));
            img.setOrder(item.order());
            imageRepo.save(img);
        }

        return imageRepo.findByBookIdOrderByOrderAsc(bookId).stream().map(this::toImageResponse).toList();
    }

    public void deleteImage(UUID bookId, UUID imageId, UUID branchId) {
        bookRepo.findByIdAndBranchId(bookId, branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livro não encontrado."));

        BookImage image = imageRepo.findByIdAndBookId(imageId, bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagem não encontrada."));

        storageService.delete(image.getUrl());
        imageRepo.delete(image);
    }

    private void validateCondition(String condition) {
        if (!"new".equals(condition) && !"used".equals(condition)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "condition deve ser 'new' ou 'used'.");
        }
    }

    private void validateIsbn(String isbn) {
        if (isbn == null) return;
        String clean = isbn.replaceAll("[\\s-]", "");
        if (!ISBN_10.matcher(clean).matches() && !ISBN_13.matcher(clean).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ISBN inválido. Informe ISBN-10 ou ISBN-13.");
        }
    }

    private void validateYear(Integer year) {
        if (year == null) return;
        int current = Year.now().getValue();
        if (year < 1 || year > current) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ano inválido.");
        }
    }

    private void validateSortField(String sort) {
        if (sort == null) return;
        if (!List.of("title", "sale_price", "registered_at").contains(sort)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sort inválido.");
        }
    }

    private String mapSortField(String sort) {
        if (sort == null) return "registered_at";
        return switch (sort) {
            case "title"        -> "title";
            case "sale_price"   -> "sale_price";
            case "registered_at"-> "registered_at";
            default             -> "registered_at";
        };
    }

    private BookResponse toBookResponse(Book book, int qty, List<ImageResponse> images) {
        return new BookResponse(
                book.getId(), book.getTitle(), book.getAuthor(), book.getIsbn(),
                book.getPublisher(), book.getYear(), book.getCategory(), book.getCondition(),
                book.getConditionDescription(), book.getSalePrice(), book.getDescription(),
                book.getShelfLocation(), book.getBranch().getId(), book.getRegisteredAt(),
                book.getActive(), qty, images);
    }

    private ImageResponse toImageResponse(BookImage img) {
        return new ImageResponse(img.getId(), img.getUrl(), img.getOrder());
    }

    private BookPageResponse toPageResponse(Page<BookSummaryProjection> raw) {
        List<BookSummaryResponse> content = raw.getContent().stream()
                .map(row -> new BookSummaryResponse(
                        row.getId(), row.getTitle(), row.getAuthor(), row.getCategory(),
                        row.getCondition(), row.getSalePrice(), row.getStockQuantity(), row.getShelfLocation()))
                .toList();
        return new BookPageResponse(content, raw.getNumber(), raw.getSize(), raw.getTotalElements(), raw.getTotalPages());
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
