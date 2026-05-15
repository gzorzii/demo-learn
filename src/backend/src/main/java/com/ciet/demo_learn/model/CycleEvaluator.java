package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.EvaluatorSource;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.enums.EvaluatorType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "cycle_evaluator")
public class CycleEvaluator extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_subject_id")
    private CycleSubject cycleSubject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluator_user_id")
    private User evaluatorUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluator_type", nullable = false)
    private EvaluatorType evaluatorType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EvaluatorStatus status;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private EvaluatorSource source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by")
    private User addedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public CycleSubject getCycleSubject() {
        return cycleSubject;
    }

    public void setCycleSubject(CycleSubject cycleSubject) {
        this.cycleSubject = cycleSubject;
    }

    public User getEvaluatorUser() {
        return evaluatorUser;
    }

    public void setEvaluatorUser(User evaluatorUser) {
        this.evaluatorUser = evaluatorUser;
    }

    public EvaluatorType getEvaluatorType() {
        return evaluatorType;
    }

    public void setEvaluatorType(EvaluatorType evaluatorType) {
        this.evaluatorType = evaluatorType;
    }

    public EvaluatorStatus getStatus() {
        return status;
    }

    public void setStatus(EvaluatorStatus status) {
        this.status = status;
    }

    public Boolean getIsMandatory() {
        return isMandatory;
    }

    public void setIsMandatory(Boolean isMandatory) {
        this.isMandatory = isMandatory;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(Instant respondedAt) {
        this.respondedAt = respondedAt;
    }

    public EvaluatorSource getSource() {
        return source;
    }

    public void setSource(EvaluatorSource source) {
        this.source = source;
    }

    public User getAddedBy() {
        return addedBy;
    }

    public void setAddedBy(User addedBy) {
        this.addedBy = addedBy;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
