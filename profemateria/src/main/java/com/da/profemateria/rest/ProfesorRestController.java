package com.da.profemateria.rest;

import com.da.profemateria.dao.ProfesorDAO;
import com.da.profemateria.entity.Profesor;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
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
@CrossOrigin(origins = "*")
public class ProfesorRestController {
    private ProfesorDAO profesorDAO;
    
    @Autowired
    public ProfesorRestController(ProfesorDAO profesorDAO){
        this.profesorDAO = profesorDAO;
    }
    
    @GetMapping("/profesor")
    public List <Profesor> findAll(){
        return profesorDAO.findAll();
    }
    @GetMapping("/profesor/(id)")
    public Profesor findById(@PathVariable int id){
        return profesorDAO.findById(id);
    }
    
    @PostMapping("/profesor")
    public Profesor save(@RequestBody Profesor profesor){
        profesorDAO.save(profesor);
        return profesor;
    }
    
    @PutMapping("/profesor")
    public Profesor update(@RequestBody Profesor profesor){
        profesorDAO.update(profesor);
        return profesor;
    }
    
    @DeleteMapping("/profesor/id")
    public String delete(@PathVariable int id){
        profesorDAO.delete(id);
        return "Profesor eliminado - id" + id;
    }
    
        
        
}
