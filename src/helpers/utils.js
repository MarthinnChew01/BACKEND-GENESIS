// Función para formatear las fechas al formato dd/mm/aaaa
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Función para formatear las fechas al formato yyyy-mm-dd
function formatDateToMySql(dateString) {
    const [day, month, year] = dateString.split('/');
    
    const formattedDay = day.padStart(2, '0');
    const formattedMonth = month.padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
}

module.exports = {formatDate, formatDateToMySql}
