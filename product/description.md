# Bookstore & Used Bookstore Management System

**Version:** 2026-05-05
**Status:** Under Refinement

## Objective

Web-based management system for bookstores and used bookstores (sebos). Enables staff to register books with images, manage stock per branch, print price labels, operate a point-of-sale with flexible discounts, issue trade-in vouchers, purchase used books, track customer wishlists, search book availability, monitor shelf time, and generate sales and inventory reports. Supports multi-branch operations with role-based access control and is designed to support fiscal invoice (NF-e) emission in the future.

## Actors and profiles

| Profile | Scope | Responsibilities |
| --- | --- | --- |
| Administrator | All branches | Full system access; manages branches and all users |
| Manager | Own branch | Creates users; manages discounts and payment methods; evaluates and purchases used book lots; issues trade-in vouchers; registers customers; generates reports; receives book-arrival notifications |
| Catalog | Own branch | Registers and edits books; adds/removes book images; prints labels |
| Cashier | Own branch | Operates POS/PDV; finalizes sales; applies vouchers and discounts; receives book-arrival notifications |

**Note:** A single user can hold multiple profiles (e.g., Catalog + Cashier). Any user can add or remove images from book records.

## Business rules

### Book registration

1. Each book record stores: title, author, ISBN, publisher, year, genre/category, condition (new/used), description, sale price, and up to 10 images.
2. The condition description field is mandatory for used books and records visible damage (pen/pencil marks, missing pages, torn cover, etc.).
3. New books share one registration per title; stock is controlled by quantity.
4. Each used book gets an individual registration record.
5. When registering a book by ISBN, the system searches existing records and pre-fills base fields (title, author, publisher, year, genre) — but always creates a new, independent record.
6. Sale price is set manually per book by the Manager.
7. Stock is managed per branch; no cross-branch stock sharing.

### Labels

8. Labels are printed on A4 adhesive sheets with configurable sizes (e.g., 5 cm × 10 cm, 3 cm × 5 cm); predefined defaults are available and users can define custom sizes.
9. Each label contains: barcode (for POS scanning), sale price, and category.
10. Labels are not printed at registration time. The user selects books from a post-registration report and prints in batch, in any quantity desired.

### Discounts

11. Only the Manager can create and manage discounts.
12. A discount has a scope chosen at creation time: individual book selection, category, author, or price range (e.g., books priced between R$X and R$Y).
13. Discount value can be a percentage (%) or a fixed monetary amount (R$).
14. Each discount has an optional date-and-time range (start datetime → end datetime).
15. A book can only hold one active discount at a time. If a book already has an active discount, it cannot receive a second one until the first expires or is removed.
16. At POS, the system displays both the original price and the discounted price.

### POS / Sales

17. A sale can contain multiple books and multiple payment methods simultaneously.
18. A printed receipt is optionally issued per sale — no digital delivery.
19. POS receives barcode input via scanner; the system retrieves book info and deducts stock automatically upon sale completion.

### Vouchers (trade-in store credit)

20. Only the Manager evaluates used books brought in by customers and issues a voucher with the agreed credit value.
21. Vouchers are linked to a specific registered customer.
22. Vouchers have no expiry date and can be used partially (remaining balance is preserved for future purchases).

### Used book purchases (cash/PIX)

23. Only the Manager registers the purchase of a used book lot.
24. A lot receives a single total purchase price agreed with the customer; payment is made in cash or PIX.
25. No document is generated for the customer when selling books.
26. The purchase is recorded in the system as an inventory acquisition entry.
27. After lot acquisition, each book in the lot is registered individually as a new book record.

### Customers

28. Customer records include: name, phone, address, and CPF or CNPJ (collected for future NF-e emission).
29. A customer can express interest in multiple books not currently in stock (wishlist).
30. When a book on a customer's wishlist is registered in the system, an in-app notification is triggered for the Manager and Cashier profiles of that branch, visible in the top-right corner of the screen. Notifications can be dismissed/marked as read.

### Users and access

31. Only the Manager creates new system users for their branch; only the Administrator can manage users across all branches.
32. Only the Administrator creates and manages branches.
33. Profiles are fixed (Administrator, Manager, Catalog, Cashier) — no custom profile creation.
34. A single user can hold multiple profiles simultaneously.
35. Users belong to a specific branch (except Administrator, who has cross-branch access).

### Shelf time tracking

1. Each book registration has an independent shelf timer that starts at registration date and resets on each new registration (even for the same title).
2. Manager and Administrator configure the overdue threshold per branch (no system default).
3. When a book exceeds the configured threshold, an in-app notification is sent to the Manager of that branch.
4. A dedicated screen lists all books currently exceeding the threshold, with relevant info and days in stock.
5. Active discounts do not pause the shelf timer.

### Price history

1. Every sale price change on a book record is automatically logged with: timestamp, previous price, new price, and the user who made the change.
2. Price history is accessible only to Manager and Administrator profiles.
3. A dedicated report allows filtering by book title or author, combined with a date period filter.
4. Searching by title or author shows price changes across all registrations of books with that name — useful for comparing pricing patterns across multiple used-book entries.

### Book search

1. Any profile can search the book catalog of the current branch by title, author, or ISBN.
2. Search results show a list with relevant book info (title, author, category, condition, price, quantity in stock).
3. Opening a result displays the full book record, including photos (to show customers) and the category/section where the book is physically located.
4. Administrator searching from the admin context sees the branch they are currently logged into; they can switch branches to search other locations.

### Reports

1. The Manager can only view and generate reports for their own branch. The Administrator can generate consolidated reports across all branches.
2. All reports can be exported to Excel.

## Constraints and assumptions

- System is web-based (browser); no mobile app or desktop client.
- No customer-facing portal; system is staff-only.
- No book returns — once sold, the sale is final.
- No consignment model supported.
- No loyalty/points program.
- No fiscal invoice (NF-e/NFC-e) emission in current scope — customer CPF/CNPJ is collected for future integration.
- Receipt printing is physical only; no email or messaging delivery.
- ISBN lookup uses the system's own internal database (no external API integration).
- Label printing requires a physical printer capable of handling A4 adhesive sheets.

## High-level features

1. **Book Registration** — register new and used books with full metadata, condition description, sale price, category, and up to 10 images; ISBN lookup pre-fills base fields from existing records.
2. **Stock Management** — per-branch inventory; quantity tracking for new books; individual records for used copies.
3. **Label Configuration & Printing** — configurable A4 label sizes (defaults + custom); batch label selection and printing from post-registration report; barcode + price + category on each label.
4. **POS / PDV** — barcode scanner input; multi-item cart; multi-payment-method checkout; discount display (original + discounted price); voucher redemption (partial); automatic stock deduction; optional printed receipt.
5. **Discount Management** — manager-created discounts scoped by individual book, category, author, or price range; percentage or fixed value; date/time range; one active discount per book enforced.
6. **Voucher System** — manager-issued trade-in vouchers linked to customers; no expiry; partial redemption with balance carry-forward; applicable in POS.
7. **Used Book Purchase** — manager registers lot purchase with total value; payment in cash or PIX; recorded as inventory acquisition; books registered individually post-purchase.
8. **Customer Management** — customer records with contact data and CPF/CNPJ; multi-book wishlist per customer; in-app arrival notifications for Manager and Cashier.
9. **Payment Methods Management** — manager configures available payment methods used at checkout.
10. **User & Access Management** — fixed profiles (Admin, Manager, Catalog, Cashier); multi-profile per user; manager manages own-branch users; admin manages all.
11. **Branch Management** — administrator creates and manages branches; stock and users are scoped per branch.
12. **Reports** — sales by period, by hour, by day of week; best-selling books; low-stock alert for new books; vouchers issued; per-branch (Manager) or consolidated (Administrator); Excel export.

## Out of product scope

- Book returns or refund processing.
- Customer-facing portal or self-service interface.
- Digital receipt delivery (email, WhatsApp, SMS).
- Custom/dynamic profile creation.
- Fiscal/tax invoice emission (NF-e, NFC-e) — planned for future version.
- E-commerce or online sales channel. — planned for future version.
- Supplier or purchase order management.
- Consignment model.
- Customer loyalty/points program.
- External ISBN lookup API integration.
