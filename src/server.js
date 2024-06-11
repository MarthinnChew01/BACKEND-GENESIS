const express = require('express');
const createDbConnection = require('./config/db.conection');
const soap = require('soap');
const cors = require('cors'); 
const { formatDate, formatDateToMySql } = require('./helpers/utils');



const app = express();
app.use(express.json());
app.use(cors()); 

let dbConnection;


async function initializeDatabase() {
    try {
        dbConnection = await createDbConnection();
    } catch (error) {
        console.error('No se pudo establecer la conexión a la base de datos:', error);
    }
}

app.get('/variables-disponibles', async (req, res) => {
    const url = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx?WSDL';
    
    soap.createClient(url, (err, client) => {
    if (err) {
        console.error('Error creando el cliente SOAP:', err);
        return res.status(500).send('Error creando el cliente SOAP');
    }

    client.VariablesDisponibles({}, (err, result) => {
        if (err) {
            console.error('Error llamando al método SOAP:', err);
            return res.status(500).send('Error llamando al método SOAP');
        }

        res.json(result);
    });
    });
});


app.get('/tipo-cambio-rango', async (req, res) => {
    const { fecha_ini, fecha_fin } = req.query;

    if (!fecha_ini || !fecha_fin) {
        return res.status(400).json({ error: 'Debes proporcionar las fechas de inicio y fin.' });
    }

    try {
        const fechaInicio = formatDate(fecha_ini);
        const fechaFin = formatDate(fecha_fin);

        const url = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx?WSDL';
        const client = await soap.createClientAsync(url);

        const result = await client.TipoCambioRangoAsync({fechainit: fechaInicio, fechafin: fechaFin});
        
        const tasas = result[0].TipoCambioRangoResult.Vars.Var;
        

        let totalCompra = 0;
        let totalVenta = 0;
        tasas.forEach((tasa) => {
            totalCompra += parseFloat(tasa.venta);
            totalVenta += parseFloat(tasa.compra);
        });
        const promedioCompra = totalCompra / tasas.length;
        const promedioVenta = totalVenta / tasas.length;


        res.json({ promedioCompra, promedioVenta });
    } catch (error) {
        console.error('Error al obtener el promedio de la tasa de cambio:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


app.post('/guardar-tasa-cambio', async (req, res) => {

    const { fecha_ini, fecha_fin } = req.body;


    if (!fecha_ini || !fecha_fin) {
        return res.status(400).json({ error: 'Debes proporcionar las fechas de inicio y fin.' });
    }

    try {

        const fechaInicio = formatDate(fecha_ini);
        const fechaFin = formatDate(fecha_fin);

        const fecha_iniciog = formatDateToMySql(fechaInicio);
        const fecha_fing = formatDateToMySql(fechaFin);
    
        const url = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx?WSDL';
        const client = await soap.createClientAsync(url);
    
        const result = await client.TipoCambioRangoAsync({fechainit: fechaInicio, fechafin: fechaFin});
        

        const tasas = result[0].TipoCambioRangoResult.Vars.Var;
        const totalItems = result[0].TipoCambioRangoResult.TotalItems;
    

        let totalCompra = 0;
        let totalVenta = 0;
        tasas.forEach((tasa) => {
            totalCompra += parseFloat(tasa.venta);
            totalVenta += parseFloat(tasa.compra);
        });
        const promedioCompra = totalCompra / tasas.length;
        const promedioVenta = totalVenta / tasas.length;
        

        const query = 'INSERT INTO `tasa-cambio` (`fecha_inicio`, `fecha_fin`, `promedio_compra`, `promedio_venta`) VALUES (?, ?, ?, ?)';
        await dbConnection.query(query, [fecha_iniciog, fecha_fing, promedioCompra, promedioVenta]);

        res.status(200).json({ message: 'Datos de tasa de cambio guardados correctamente.' });
    } catch (error) {
        console.error('Error al guardar los datos de tasa de cambio:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});



app.get('/get-tasa-cambio', async (req, res) => {
    const query = 'SELECT * FROM `tasa-cambio`'; 
    try {
        const [results] = await dbConnection.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error ejecutando la consulta:', error);
        res.status(500).send({
            message: error.message || 'Some error occurred while retrieving users.'
        });
    }
});

app.get('/tipo-cambio-fecha-inicial', async (req, res) => {
    const { fecha_ini, page = 1, limit = 10 } = req.query;

    if (!fecha_ini) {
        return res.status(400).json({ error: 'Debes proporcionar la fecha de inicio.' });
    }

    try {

        const fechaInicio = formatDate(fecha_ini);

        const url = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx?WSDL';
        const client = await soap.createClientAsync(url);

        const result = await client.TipoCambioFechaInicialAsync({ fechainit: fechaInicio });

        const tasas = result[0].TipoCambioFechaInicialResult.Vars.Var;

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedTasas = tasas.slice(startIndex, endIndex);

        res.json({
            tasas: paginatedTasas,
            totalItems: tasas.length,
            currentPage: page,
            totalPages: Math.ceil(tasas.length / limit),
        });
    } catch (error) {
        console.error('Error al obtener la tasa de cambio:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Rutas
app.get('/', (req, res) => {
    res.send('Bienvenido a mi API REST!');
});

// Iniciar el servidor
const PORT = process.env.PORT || 4200;

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Servidor corriendo en el puerto ${PORT}.`);
});
