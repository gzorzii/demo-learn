package com.ciet.demo_learn.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "pr_calibration_result")
public class PrCalibrationResult extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_subject_id")
    private CycleSubject cycleSubject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calibration_item_id")
    private CalibrationItem calibrationItem;

    @Column(name = "d1_score_final", nullable = false)
    private Integer d1ScoreFinal;

    @Column(name = "d2_score_final", nullable = false)
    private Integer d2ScoreFinal;

    @Column(name = "d3_score_final", nullable = false)
    private Integer d3ScoreFinal;

    @Column(name = "nine_box_x", nullable = false)
    private Integer nineBoxX;

    @Column(name = "nine_box_y", nullable = false)
    private Integer nineBoxY;

    public CycleSubject getCycleSubject() {
        return cycleSubject;
    }

    public void setCycleSubject(CycleSubject cycleSubject) {
        this.cycleSubject = cycleSubject;
    }

    public CalibrationItem getCalibrationItem() {
        return calibrationItem;
    }

    public void setCalibrationItem(CalibrationItem calibrationItem) {
        this.calibrationItem = calibrationItem;
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

    public Integer getNineBoxX() {
        return nineBoxX;
    }

    public void setNineBoxX(Integer nineBoxX) {
        this.nineBoxX = nineBoxX;
    }

    public Integer getNineBoxY() {
        return nineBoxY;
    }

    public void setNineBoxY(Integer nineBoxY) {
        this.nineBoxY = nineBoxY;
    }
}
