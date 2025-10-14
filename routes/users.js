const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/users - Guardar información personal
router.post('/', async (req, res) => {
  try {
    const { nombre, email, telefono, direccion, especialidades, video_confirmado } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    let user;
    if (existingUser.rows.length > 0) {
      // Actualizar usuario existente
      const updateQuery = `
        UPDATE users 
        SET nombre = $1, telefono = $2, direccion = $3, especialidades = $4, 
            video_confirmado = $5, updated_at = CURRENT_TIMESTAMP
        WHERE email = $6
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [nombre, telefono, direccion, especialidades, video_confirmado, email]);
      user = result.rows[0];
    } else {
      // Crear nuevo usuario
      const insertQuery = `
        INSERT INTO users (nombre, email, telefono, direccion, especialidades, video_confirmado)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [nombre, email, telefono, direccion, especialidades, video_confirmado]);
      user = result.rows[0];
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: existingUser.rows.length > 0 ? 'Usuario actualizado' : 'Usuario creado'
    });
    
  } catch (error) {
    console.error('Error en /api/users:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar usuario',
      error: error.message
    });
  }
});

// GET /api/users/:email - Obtener usuario por email
router.get('/:email', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [req.params.email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
});

module.exports = router;
