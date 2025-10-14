const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/countries - Obtener todos los países
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM country ORDER BY id');
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error obteniendo países:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener países'
    });
  }
});

// POST /api/countries/select - Guardar selección de país (temporal en sesión)
router.post('/select', async (req, res) => {
  try {
    const { countryId } = req.body;
    
    // Verificar que el país existe
    const result = await pool.query('SELECT * FROM country WHERE id = $1', [countryId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'País no encontrado'
      });
    }
    
    // Retornar el país seleccionado
    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'País seleccionado correctamente'
    });
    
  } catch (error) {
    console.error('Error seleccionando país:', error);
    res.status(500).json({
      success: false,
      message: 'Error al seleccionar país'
    });
  }
});

module.exports = router;
