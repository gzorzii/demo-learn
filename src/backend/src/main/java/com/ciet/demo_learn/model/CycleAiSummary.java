package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.AiSummaryStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cycle_ai_summary")
public class CycleAiSummary extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_subject_id")
    private CycleSubject cycleSubject;

    @Column(name = "summary_text")
    private String summaryText;

    @Column(name = "coherence_analysis")
    private String coherenceAnalysis;

    @Column(name = "ai_model_version")
    private String aiModelVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AiSummaryStatus status;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "generated_at")
    private Instant generatedAt;

    public CycleSubject getCycleSubject() {
        return cycleSubject;
    }

    public void setCycleSubject(CycleSubject cycleSubject) {
        this.cycleSubject = cycleSubject;
    }

    public String getSummaryText() {
        return summaryText;
    }

    public void setSummaryText(String summaryText) {
        this.summaryText = summaryText;
    }

    public String getCoherenceAnalysis() {
        return coherenceAnalysis;
    }

    public void setCoherenceAnalysis(String coherenceAnalysis) {
        this.coherenceAnalysis = coherenceAnalysis;
    }

    public String getAiModelVersion() {
        return aiModelVersion;
    }

    public void setAiModelVersion(String aiModelVersion) {
        this.aiModelVersion = aiModelVersion;
    }

    public AiSummaryStatus getStatus() {
        return status;
    }

    public void setStatus(AiSummaryStatus status) {
        this.status = status;
    }

    public UUID getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(UUID approvedBy) {
        this.approvedBy = approvedBy;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }
}
