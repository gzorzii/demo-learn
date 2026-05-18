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
@Table(name = "cf_pdm_evaluation_response")
public class CfPdmEvaluationResponse {

    @Id
    @GenerateUuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_evaluator_id", nullable = false)
    private CycleEvaluator cycleEvaluator;

    @Column(name = "resultado", nullable = false)
    private String resultado;

    @Column(name = "prontidao", nullable = false)
    private String prontidao;

    @Column(name = "action", nullable = false)
    private String action;

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

    public String getResultado() {
        return resultado;
    }

    public void setResultado(String resultado) {
        this.resultado = resultado;
    }

    public String getProntidao() {
        return prontidao;
    }

    public void setProntidao(String prontidao) {
        this.prontidao = prontidao;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
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
