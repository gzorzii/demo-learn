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
@Table(name = "cf_pdm_evaluation_draft")
public class CfPdmEvaluationDraft {

    @Id
    @GenerateUuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_evaluator_id", nullable = false)
    private CycleEvaluator cycleEvaluator;

    @Column(name = "resultado_draft")
    private String resultadoDraft;

    @Column(name = "prontidao_draft")
    private String prontidaoDraft;

    @Column(name = "action_draft")
    private String actionDraft;

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

    public String getResultadoDraft() {
        return resultadoDraft;
    }

    public void setResultadoDraft(String resultadoDraft) {
        this.resultadoDraft = resultadoDraft;
    }

    public String getProntidaoDraft() {
        return prontidaoDraft;
    }

    public void setProntidaoDraft(String prontidaoDraft) {
        this.prontidaoDraft = prontidaoDraft;
    }

    public String getActionDraft() {
        return actionDraft;
    }

    public void setActionDraft(String actionDraft) {
        this.actionDraft = actionDraft;
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
