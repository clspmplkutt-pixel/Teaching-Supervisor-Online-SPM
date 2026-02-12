function Remove_Khet(id) {

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
        window.location.href = '?module=khet_remove&khet_code=' + id;
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

function Remove_school(id) {

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
        window.location.href = '?module=school_remove&school_id=' + id;
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

function set_year(id) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าปีงบประมาณ ?',
    text: "ตั้งค่าปี " + id + " เป็นปีปัจจุบันหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ตั้งเป็นปีปัจจุบัน!',
    cancelButtonText: 'ไม่ ยกเลิกการดำเนินการ!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=budget_year_set&year=' + id;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_eduyear(id,year,section) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าปีการศึกษา ?',
    text: "ตั้งค่าปี " + year + " ภาคเรียนที่ "+ section +" เป็นปีการศึกษาปัจจุบันหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ตั้งเป็นปีการศึกษาปัจจุบัน!',
    cancelButtonText: 'ไม่ ยกเลิกการดำเนินการ!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=education_year_set&id=' + id;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_prefix(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าคำนำหน้า ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=prefix_set&id=' + id + '&prefix_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_TeachSubject(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งานกลุ่มสาระการเรียนรู้ ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=teach_subject_set&id=' + id + '&teach_subject_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_AcademicStanding(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งานวิทยฐานะ/ตำแหน่งทางวิชาการ ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=academic_standing_set&id=' + id + '&academic_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_PersonType(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งาน ประเภทบุคลากร ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=person_type_set&id=' + id + '&persontype_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_PersonPositionType(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งาน ชื่อตำแหน่งบุคลากร ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=person_position_type_set&id=' + id + '&position_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}


function set_SubjectType(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งาน ประเภทวิชา ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=subject_type_set&id=' + id + '&subjecttype_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}


function set_EducationLevel(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งาน ระดับการศึกษา ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=education_level_set&id=' + id + '&educationlevel_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}

function set_GradeLevel(id, status) {

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })

  swalWithBootstrapButtons.fire({
    title: 'ตั้งค่าใช้งาน ระดับชั้น ?',
    text: "ตั้งค่าการใช้งานหรือไม่ ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่!',
    cancelButtonText: 'ไม่!',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value) {
        window.location.href = '?module=grade_level_set&id=' + id + '&grade_level_status=' + status;
      }
    } else if (
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'ยกเลิก',
        'ยกเลิกการดำเนินการสำเร็จ :)',
        'error'
      )
    }
  });
}
function province_sel(str) {
  document.getElementById("khet_code1").value = str;
  document.getElementById("khet_code1").focus();
}

function chk_khet_code() {
  str = document.getElementById("khet_code1").value;
  if (str.length == 0) {
    return false;
  } else {
    if (str.length != 4) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'รหัสสหวิทยาเขตต้องมี 4 หลัก',
      });
      document.getElementById("khet_code").classList.remove("is-valid");
      document.getElementById("khet_code").classList.add("is-invalid");
      return false;
    } else {
      document.getElementById("khet_code").classList.remove("is-invalid");
      document.getElementById("khet_code").classList.add("is-valid");
      return true;
    }
  }
}

function Remove_User(id,from) {
console.log(id);
console.log(from);
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
        window.location.href = '?module=user_remove&people_id=' + id + '&from=' + from;
        
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