package com.ciet.demo_learn.domain.purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface UsedBookPurchaseRepository extends JpaRepository<UsedBookPurchase, UUID> {}
