package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.CalibrationItemStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calibration_item")
public class CalibrationItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calibration_session_id")
    private CalibrationSession calibrationSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_subject_id")
    private CycleSubject cycleSubject;

    @Column(name = "nine_box_x_proposed")
    private Integer nineBoxXProposed;

    @Column(name = "nine_box_y_proposed")
    private Integer nineBoxYProposed;

    @Column(name = "nine_box_x_final")
    private Integer nineBoxXFinal;

    @Column(name = "nine_box_y_final")
    private Integer nineBoxYFinal;

    @Column(name = "d1_score_final")
    private Integer d1ScoreFinal;

    @Column(name = "d2_score_final")
    private Integer d2ScoreFinal;

    @Column(name = "d3_score_final")
    private Integer d3ScoreFinal;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "last_saved_at")
    private Instant lastSavedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CalibrationItemStatus status;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public CalibrationSession getCalibrationSession() {
        return calibrationSession;
    }

    public void setCalibrationSession(CalibrationSession calibrationSession) {
        this.calibrationSession = calibrationSession;
    }

    public CycleSubject getCycleSubject() {
        return cycleSubject;
    }

    public void setCycleSubject(CycleSubject cycleSubject) {
        this.cycleSubject = cycleSubject;
    }

    public Integer getNineBoxXProposed() {
        return nineBoxXProposed;
    }

    public void setNineBoxXProposed(Integer nineBoxXProposed) {
        this.nineBoxXProposed = nineBoxXProposed;
    }

    public Integer getNineBoxYProposed() {
        return nineBoxYProposed;
    }

    public void setNineBoxYProposed(Integer nineBoxYProposed) {
        this.nineBoxYProposed = nineBoxYProposed;
    }

    public Integer getNineBoxXFinal() {
        return nineBoxXFinal;
    }

    public void setNineBoxXFinal(Integer nineBoxXFinal) {
        this.nineBoxXFinal = nineBoxXFinal;
    }

    public Integer getNineBoxYFinal() {
        return nineBoxYFinal;
    }

    public void setNineBoxYFinal(Integer nineBoxYFinal) {
        this.nineBoxYFinal = nineBoxYFinal;
    }

    public Integer getD1ScoreFinal() {
        return d1ScoreFinal;
    }

    public void setD1ScoreFinal(Integer d1ScoreFinal) {
        this.d1ScoreFinal = d1ScoreFinal;
    }

    public Integer getD2ScoreFinal() {
        return d2ScoreFinal;
    }

    public void setD2ScoreFinal(Integer d2ScoreFinal) {
        this.d2ScoreFinal = d2ScoreFinal;
    }

    public Integer getD3ScoreFinal() {
        return d3ScoreFinal;
    }

    public void setD3ScoreFinal(Integer d3ScoreFinal) {
        this.d3ScoreFinal = d3ScoreFinal;
    }

    public UUID getClosedBy() {
        return closedBy;
    }

    public void setClosedBy(UUID closedBy) {
        this.closedBy = closedBy;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getLastSavedAt() {
        return lastSavedAt;
    }

    public void setLastSavedAt(Instant lastSavedAt) {
        this.lastSavedAt = lastSavedAt;
    }

    public CalibrationItemStatus getStatus() {
        return status;
    }

    public void setStatus(CalibrationItemStatus status) {
        this.status = status;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
