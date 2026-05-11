package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.purchase.UsedBookPurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UsedBookPurchaseItemRepository extends JpaRepository<UsedBookPurchaseItem, UUID> {
}
