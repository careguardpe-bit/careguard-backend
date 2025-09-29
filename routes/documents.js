const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

// Asegurar que existe la carpeta de uploads
const uploadDir = path.join(__dirname, '../uploads/documents/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Crear carpeta si no existe (por si acaso)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// POST /api/documents - Subir documento
router.post('/', upload.single('document'), async (req, res) => {
  try {
    const { user_email, document_type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo'
      });
    }

    // Buscar usuario por email
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [user_email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userId = userResult.rows[0].id;

    // Eliminar documento anterior del mismo tipo si existe
    await pool.query('DELETE FROM documents WHERE user_id = $1 AND document_type = $2', [userId, document_type]);

    // Guardar nuevo documento
    const insertQuery = `
      INSERT INTO documents (user_id, document_type, filename, original_name, file_size, mime_type, file_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      userId,
      document_type,
      req.file.filename,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      req.file.path
    ]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Documento subido correctamente'
    });

  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir documento',
      error: error.message
    });
  }
});

// GET /api/documents/:user_email - Obtener documentos de un usuario
router.get('/:user_email', async (req, res) => {
  try {
    const query = `
      SELECT d.* FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE u.email = $1
      ORDER BY d.uploaded_at DESC
    `;
    
    const result = await pool.query(query, [req.params.user_email]);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos'
    });
  }
});

module.exports = router;
