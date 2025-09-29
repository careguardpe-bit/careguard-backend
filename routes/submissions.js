const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/submissions - Crear nueva postulación
router.post('/', async (req, res) => {
  try {
    const { user_email, terms_accepted } = req.body;
    
    // Buscar usuario
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [user_email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userId = userResult.rows[0].id;
    
    // Generar número de referencia
    const referenceNumber = `CG-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;

    // Crear postulación
    const insertQuery = `
      INSERT INTO submissions (user_id, reference_number, terms_accepted)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [userId, referenceNumber, terms_accepted]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Postulación enviada correctamente'
    });

  } catch (error) {
    console.error('Error creando postulación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar postulación',
      error: error.message
    });
  }
});

// GET /api/submissions/:user_email - Obtener postulaciones de un usuario
router.get('/:user_email', async (req, res) => {
  try {
    const query = `
      SELECT s.*, u.nombre, u.email 
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      WHERE u.email = $1
      ORDER BY s.submission_date DESC
    `;
    
    const result = await pool.query(query, [req.params.user_email]);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error obteniendo postulaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener postulaciones'
    });
  }
});

module.exports = router;