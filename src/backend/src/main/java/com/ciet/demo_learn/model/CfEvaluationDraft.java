package com.ciet.demo_learn.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.ciet.demo_learn.annotation.GenerateUuidV7;

@Entity
@Table(name = "cf_evaluation_draft")
public class CfEvaluationDraft {

    @Id
    @GenerateUuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_evaluator_id", nullable = false)
    private CycleEvaluator cycleEvaluator;

    @Column(name = "draft_text", nullable = false)
    private String draftText;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public UUID getId() {
        return id;
    }

    public CycleEvaluator getCycleEvaluator() {
        return cycleEvaluator;
    }

    public void setCycleEvaluator(CycleEvaluator cycleEvaluator) {
        this.cycleEvaluator = cycleEvaluator;
    }

    public String getDraftText() {
        return draftText;
    }

    public void setDraftText(String draftText) {
        this.draftText = draftText;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
