package com.ciet.demo_learn.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "cycle_self_evaluation")
public class CycleSelfEvaluation extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_subject_id")
    private CycleSubject cycleSubject;

    @Column(name = "content")
    private String content;

    @Column(name = "d1_score")
    private Integer d1Score;

    @Column(name = "d1_comment")
    private String d1Comment;

    @Column(name = "d2_score")
    private Integer d2Score;

    @Column(name = "d2_comment")
    private String d2Comment;

    @Column(name = "d3_score")
    private Integer d3Score;

    @Column(name = "d3_comment")
    private String d3Comment;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    public CycleSubject getCycleSubject() {
        return cycleSubject;
    }

    public void setCycleSubject(CycleSubject cycleSubject) {
        this.cycleSubject = cycleSubject;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getD1Score() {
        return d1Score;
    }

    public void setD1Score(Integer d1Score) {
        this.d1Score = d1Score;
    }

    public String getD1Comment() {
        return d1Comment;
    }

    public void setD1Comment(String d1Comment) {
        this.d1Comment = d1Comment;
    }

    public Integer getD2Score() {
        return d2Score;
    }

    public void setD2Score(Integer d2Score) {
        this.d2Score = d2Score;
    }

    public String getD2Comment() {
        return d2Comment;
    }

    public void setD2Comment(String d2Comment) {
        this.d2Comment = d2Comment;
    }

    public Integer getD3Score() {
        return d3Score;
    }

    public void setD3Score(Integer d3Score) {
        this.d3Score = d3Score;
    }

    public String getD3Comment() {
        return d3Comment;
    }

    public void setD3Comment(String d3Comment) {
        this.d3Comment = d3Comment;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }
}
