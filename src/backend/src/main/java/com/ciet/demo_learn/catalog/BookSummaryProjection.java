package com.ciet.demo_learn.catalog;

import java.math.BigDecimal;
import java.util.UUID;

public interface BookSummaryProjection {
    UUID getId();
    String getTitle();
    String getAuthor();
    String getCategory();
    String getCondition();
    BigDecimal getSalePrice();
    String getShelfLocation();
    Integer getStockQuantity();
}
