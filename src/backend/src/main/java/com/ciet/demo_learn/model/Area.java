package com.ciet.demo_learn.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "area")
public class Area extends BaseEntity {

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "growth_unit", nullable = false)
    private String growthUnit;

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getGrowthUnit() {
        return growthUnit;
    }

    public void setGrowthUnit(String growthUnit) {
        this.growthUnit = growthUnit;
    }
}
