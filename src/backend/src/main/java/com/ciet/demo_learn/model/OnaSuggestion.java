package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.CycleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "ona_suggestion")
public class OnaSuggestion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_user_id")
    private User subjectUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suggested_user_id")
    private User suggestedUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "cycle_type", nullable = false)
    private CycleType cycleType;

    @Column(name = "cycle_subject_id")
    private UUID cycleSubjectId;

    @Column(name = "reason_mock")
    private String reasonMock;

    public User getSubjectUser() {
        return subjectUser;
    }

    public void setSubjectUser(User subjectUser) {
        this.subjectUser = subjectUser;
    }

    public User getSuggestedUser() {
        return suggestedUser;
    }

    public void setSuggestedUser(User suggestedUser) {
        this.suggestedUser = suggestedUser;
    }

    public CycleType getCycleType() {
        return cycleType;
    }

    public void setCycleType(CycleType cycleType) {
        this.cycleType = cycleType;
    }

    public UUID getCycleSubjectId() {
        return cycleSubjectId;
    }

    public void setCycleSubjectId(UUID cycleSubjectId) {
        this.cycleSubjectId = cycleSubjectId;
    }

    public String getReasonMock() {
        return reasonMock;
    }

    public void setReasonMock(String reasonMock) {
        this.reasonMock = reasonMock;
    }
}
