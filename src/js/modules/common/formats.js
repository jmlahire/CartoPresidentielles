


const FormatFloat = (value, digits) => {
    digits = digits || 2;
    return value.toLocaleString('fr-FR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}
const FormatInt = (value) => {
    return parseInt(value).toLocaleString('fr-FR');
}
const FormatPercent = (value,digits) => FormatFloat(value,digits)+'%';





export {FormatPercent,FormatInt,FormatFloat}