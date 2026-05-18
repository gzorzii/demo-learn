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
@Table(name = "cf_evaluation_response")
public class CfEvaluationResponse {

    @Id
    @GenerateUuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_evaluator_id", nullable = false)
    private CycleEvaluator cycleEvaluator;

    @Column(name = "response_text", nullable = false)
    private String responseText;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

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

    public String getResponseText() {
        return responseText;
    }

    public void setResponseText(String responseText) {
        this.responseText = responseText;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
