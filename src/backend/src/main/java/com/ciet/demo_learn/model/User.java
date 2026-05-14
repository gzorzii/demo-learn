package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.PositionMap;
import com.ciet.demo_learn.enums.Role;
import jakarta.persistence.*;

import java.time.Instant;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "login", nullable = false, unique = true)
    private String login;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "position_map", nullable = false)
    private PositionMap positionMap;

    @Column(name = "admission_date")
    private LocalDate admissionDate;

    @Column(name = "active", nullable = false)
    private Boolean active;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id")
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdm_id")
    private User pdm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bp_id")
    private User bp;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<UserPermission> userPermissions = new ArrayList<>();

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public PositionMap getPositionMap() {
        return positionMap;
    }

    public void setPositionMap(PositionMap positionMap) {
        this.positionMap = positionMap;
    }

    public User getPdm() {
        return pdm;
    }

    public void setPdm(User pdm) {
        this.pdm = pdm;
    }

    public User getBp() {
        return bp;
    }

    public void setBp(User bp) {
        this.bp = bp;
    }

    public List<UserPermission> getUserPermissions() {
        return userPermissions;
    }

    public void setUserPermissions(List<UserPermission> userPermissions) {
        this.userPermissions = userPermissions;
    }

    public LocalDate getAdmissionDate() {
        return admissionDate;
    }

    public void setAdmissionDate(LocalDate admissionDate) {
        this.admissionDate = admissionDate;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Area getArea() {
        return area;
    }

    public void setArea(Area area) {
        this.area = area;
    }
}
