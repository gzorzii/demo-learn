package com.ciet.demo_learn.domain.voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.math.BigDecimal;
import java.util.*;
public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    List<Voucher> findAllByCustomerIdAndBalanceGreaterThan(UUID customerId, BigDecimal zero);
    List<Voucher> findAllByBranchId(UUID branchId);
}
