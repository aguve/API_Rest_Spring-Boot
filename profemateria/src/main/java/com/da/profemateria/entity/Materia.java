package com.da.profemateria.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "materia")
public class Materia {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private int idMateria;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "creditos")
    private int creditos;

    @Column(name = "horas_catedra")
    private int horasCatedra;

    @Column(name = "id_profesor")
    private int idProfesor;

    public Materia() {
    }

    public Materia(String nombre, int creditos, int horasCatedra, int idProfesor) {
        this.nombre = nombre;
        this.creditos = creditos;
        this.horasCatedra = horasCatedra;
        this.idProfesor = idProfesor;
    }

    public int getIdMateria() {
        return idMateria;
    }

    public void setIdMateria(int idMateria) {
        this.idMateria = idMateria;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public int getCreditos() {
        return creditos;
    }

    public void setCreditos(int creditos) {
        this.creditos = creditos;
    }

    public int getHorasCatedra() {
        return horasCatedra;
    }

    public void setHorasCatedra(int horasCatedra) {
        this.horasCatedra = horasCatedra;
    }

    public int getIdProfesor() {
        return idProfesor;
    }

    public void setIdProfesor(int idProfesor) {
        this.idProfesor = idProfesor;
    }

}
