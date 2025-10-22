const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/users - Guardar información personal
router.post('/', async (req, res) => {
  try {
    const { 
      nombre, 
      email, 
      telefono, 
      direccion, 
      especialidades, 
      video_confirmado,
      country_id 
    } = req.body;
    
    console.log('📥 Datos recibidos:', req.body); // Debug
    
    // Validar campos requeridos
    if (!country_id) {
      return res.status(400).json({
        success: false,
        message: 'El país es requerido'
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }
    
    // 🔥 Asegurar que especialidades sea un string JSON
    let especialidadesStr = especialidades;
    if (Array.isArray(especialidades)) {
      especialidadesStr = JSON.stringify(especialidades);
    } else if (typeof especialidades === 'object') {
      especialidadesStr = JSON.stringify(especialidades);
    }
    
    console.log('📝 Especialidades procesadas:', especialidadesStr); // Debug
    
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    let user;
    if (existingUser.rows.length > 0) {
      // Actualizar usuario existente
      const updateQuery = `
        UPDATE users 
        SET nombre = $1, telefono = $2, direccion = $3, especialidades = $4, 
            video_confirmado = $5, country_id = $6, updated_at = CURRENT_TIMESTAMP
        WHERE email = $7
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        nombre, 
        telefono, 
        direccion, 
        especialidadesStr,  // 🔥 String JSON
        video_confirmado, 
        country_id, 
        email
      ]);
      user = result.rows[0];
      
      console.log('✅ Usuario actualizado:', user.email);
    } else {
      // Crear nuevo usuario
      const insertQuery = `
        INSERT INTO users (nombre, email, telefono, direccion, especialidades, video_confirmado, country_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        nombre, 
        email, 
        telefono, 
        direccion, 
        especialidadesStr,  // 🔥 String JSON
        video_confirmado, 
        country_id
      ]);
      user = result.rows[0];
      
      console.log('✅ Usuario creado:', user.email);
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: existingUser.rows.length > 0 ? 'Usuario actualizado' : 'Usuario creado'
    });
    
  } catch (error) {
    console.error('❌ Error en /api/users:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al guardar usuario',
      error: error.message
    });
  }
});

// GET /api/users/:email - Obtener usuario por email (con información del país)
router.get('/:email', async (req, res) => {
  try {
    const query = `
      SELECT u.*, c.country as country_name
      FROM users u
      LEFT JOIN country c ON u.country_id = c.id
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [req.params.email]);
    
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
