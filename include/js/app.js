function success_swal(txt,url){
    Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: txt,
        showConfirmButton: false,
        timer: 1500
    });
    window.location.href = url;
}
function checkID(id) {
    if (id.length != 13) return false;
    for (i = 0, sum = 0; i < 12; i++)
         sum += parseFloat(id.charAt(i)) * (13 - i);
    if ((11 - sum % 11) % 10 != parseFloat(id.charAt(12)))
         return false;
    return true;
}