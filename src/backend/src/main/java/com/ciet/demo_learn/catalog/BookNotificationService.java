package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.book.Book;
import com.ciet.demo_learn.notification.Notification;
import com.ciet.demo_learn.wishlist.CustomerWishlist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class BookNotificationService {

    private static final Logger log = LoggerFactory.getLogger(BookNotificationService.class);
    private static final List<String> NOTIFY_ROLES = List.of("Gerente", "Caixa");

    private final CustomerWishlistRepository wishlistRepo;
    private final UserRoleRepository userRoleRepo;
    private final NotificationRepository notificationRepo;

    public BookNotificationService(CustomerWishlistRepository wishlistRepo,
                                   UserRoleRepository userRoleRepo,
                                   NotificationRepository notificationRepo) {
        this.wishlistRepo = wishlistRepo;
        this.userRoleRepo = userRoleRepo;
        this.notificationRepo = notificationRepo;
    }

    @Async
    @Transactional
    public void notifyWishlistMatches(UUID bookId, UUID branchId, String title, String author, String isbn) {
        try {
            List<CustomerWishlist> matches = wishlistRepo.findMatchesForBook(
                    branchId,
                    title != null ? title : "",
                    author != null ? author : "",
                    isbn != null ? isbn : "");

            if (matches.isEmpty()) return;

            var recipients = userRoleRepo.findUsersByBranchAndRoles(branchId, NOTIFY_ROLES);
            if (recipients.isEmpty()) return;

            var bookRef = new Book();
            bookRef.setId(bookId);

            for (CustomerWishlist match : matches) {
                for (var user : recipients) {
                    var notification = new Notification();
                    notification.setBranch(match.getBranch());
                    notification.setUser(user);
                    notification.setType("book_arrival");
                    notification.setMessage("Livro disponível: " + title);
                    notification.setBook(bookRef);
                    notification.setCustomerWishlist(match);
                    notification.setRead(false);
                    notificationRepo.save(notification);
                }
            }
        } catch (Exception e) {
            log.error("Falha ao gerar notificações de wishlist para book_id={}: {}", bookId, e.getMessage(), e);
        }
    }
}
