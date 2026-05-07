package com.ciet.demo_learn.domain.voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemption, UUID> {}
