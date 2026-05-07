package com.ciet.demo_learn.domain.sale;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface SalePaymentRepository extends JpaRepository<SalePayment, UUID> {}
