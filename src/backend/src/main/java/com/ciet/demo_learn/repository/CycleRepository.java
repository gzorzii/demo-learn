package com.ciet.demo_learn.repository;

import com.ciet.demo_learn.model.Cycle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CycleRepository extends JpaRepository<Cycle, UUID> {
}
