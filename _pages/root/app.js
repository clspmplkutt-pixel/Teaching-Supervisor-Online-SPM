function Remove_User(id) {

    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      buttonsStyling: false
    })
  
    swalWithBootstrapButtons.fire({
      title: 'ลบข้อมูลหรือไม่ ?',
      text: "คุณจะไม่สามารถยกเลิกได้หากทำการลบไปแล้ว !",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล!',
      cancelButtonText: 'ไม่ ยกเลิกการลบ!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        if (result.value) {
          window.location.href = '?module=user_remove&user=' + id;
        }
      } else if (
        result.dismiss === Swal.DismissReason.cancel
      ) {
        swalWithBootstrapButtons.fire(
          'ยกเลิก',
          'ยกเลิกการลบข้อมูลสำเร็จ :)',
          'error'
        )
      }
    });
  }