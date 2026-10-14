package com.da.profemateria.rest;

import com.da.profemateria.dao.MateriaDAO;
import com.da.profemateria.entity.Materia;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MateriaRestController {

    private MateriaDAO materiaDAO;

    @Autowired
    public MateriaRestController(MateriaDAO materiaDAO) {
        this.materiaDAO = materiaDAO;
    }

    @GetMapping("/materias")
    public List<Materia> findAll() {
        return materiaDAO.findAll();
    }

    @GetMapping("/materias/{id}")
    public Materia findById(@PathVariable int id) {
        return materiaDAO.findById(id);
    }

    @PostMapping("/materias")
    public Materia save(@RequestBody Materia materia) {
        materiaDAO.save(materia);
        return materia;
    }

    @PutMapping("/materias")
    public Materia update(@RequestBody Materia materia) {
        materiaDAO.update(materia);
        return materia;
    }

    @DeleteMapping("/materias/{id}")
    public String delete(@PathVariable int id) {
        materiaDAO.delete(id);
        return "Materia eliminada - id: " + id;
    }

}
