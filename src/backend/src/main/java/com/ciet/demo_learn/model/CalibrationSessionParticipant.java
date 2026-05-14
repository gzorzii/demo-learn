package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.SessionParticipantRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "calibration_session_participant")
public class CalibrationSessionParticipant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calibration_session_id")
    private CalibrationSession calibrationSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_user_id")
    private User participantUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_session", nullable = false)
    private SessionParticipantRole roleInSession;

    @Column(name = "confirmed_presence", nullable = false)
    private Boolean confirmedPresence;

    public CalibrationSession getCalibrationSession() {
        return calibrationSession;
    }

    public void setCalibrationSession(CalibrationSession calibrationSession) {
        this.calibrationSession = calibrationSession;
    }

    public User getParticipantUser() {
        return participantUser;
    }

    public void setParticipantUser(User participantUser) {
        this.participantUser = participantUser;
    }

    public SessionParticipantRole getRoleInSession() {
        return roleInSession;
    }

    public void setRoleInSession(SessionParticipantRole roleInSession) {
        this.roleInSession = roleInSession;
    }

    public Boolean getConfirmedPresence() {
        return confirmedPresence;
    }

    public void setConfirmedPresence(Boolean confirmedPresence) {
        this.confirmedPresence = confirmedPresence;
    }
}
