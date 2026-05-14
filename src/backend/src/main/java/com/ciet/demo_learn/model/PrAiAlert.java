package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.AiAlertStatus;
import com.ciet.demo_learn.enums.AiAlertType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "pr_ai_alert")
public class PrAiAlert extends BaseEntity {

    @Column(name = "pr_pdm_assessment_id")
    private UUID prPdmAssessmentId;

    @Column(name = "pr_peer_response_id")
    private UUID prPeerResponseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false)
    private AiAlertType alertType;

    @Column(name = "alert_message")
    private String alertMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AiAlertStatus status;

    public UUID getPrPdmAssessmentId() {
        return prPdmAssessmentId;
    }

    public void setPrPdmAssessmentId(UUID prPdmAssessmentId) {
        this.prPdmAssessmentId = prPdmAssessmentId;
    }

    public UUID getPrPeerResponseId() {
        return prPeerResponseId;
    }

    public void setPrPeerResponseId(UUID prPeerResponseId) {
        this.prPeerResponseId = prPeerResponseId;
    }

    public AiAlertType getAlertType() {
        return alertType;
    }

    public void setAlertType(AiAlertType alertType) {
        this.alertType = alertType;
    }

    public String getAlertMessage() {
        return alertMessage;
    }

    public void setAlertMessage(String alertMessage) {
        this.alertMessage = alertMessage;
    }

    public AiAlertStatus getStatus() {
        return status;
    }

    public void setStatus(AiAlertStatus status) {
        this.status = status;
    }
}
