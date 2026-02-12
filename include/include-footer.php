<!-- jQuery UI 1.11.4 -->
<!-- <script src="/plugins/jquery-ui/jquery-ui.min.js"></script> -->
<!-- Resolve conflict in jQuery UI tooltip with Bootstrap tooltip -->
<!-- Bootstrap 4 -->
<script src="/plugins/bootstrap/js/bootstrap.bundle.min.js"></script>
<!-- ChartJS -->
<script src="/plugins/chart.js/Chart.min.js"></script>
<!-- Sparkline -->
<script src="/plugins/sparklines/sparkline.js"></script>
<!-- JQVMap -->
<script src="/plugins/jqvmap/jquery.vmap.min.js"></script>
<script src="/plugins/jqvmap/maps/jquery.vmap.usa.js"></script>
<!-- jQuery Knob Chart -->
<script src="/plugins/jquery-knob/jquery.knob.min.js"></script>
<!-- daterangepicker -->
<script src="/plugins/moment/moment.min.js"></script>
<script src="/plugins/daterangepicker/daterangepicker.js"></script>
<!-- Tempusdominus Bootstrap 4 -->
<script src="/plugins/tempusdominus-bootstrap-4/js/tempusdominus-bootstrap-4.min.js"></script>
<!-- Summernote -->
<script src="/plugins/summernote/summernote-bs4.min.js"></script>
<!-- overlayScrollbars -->
<script src="/plugins/overlayScrollbars/js/jquery.overlayScrollbars.min.js"></script>

<script src="plugins/sweetalert2/sweetalert2.all.min.js"></script>
<!-- AdminLTE App -->
<script src="/dist/js/adminlte.js"></script>
<script src="include/js/app.js"></script>
<!-- DataTable -->
<!-- <link rel="stylesheet" href="plugins/datatables/datatables.css"> -->
<!-- DataTables  & Plugins -->
<script src="plugins/datatables/jquery.dataTables.min.js"></script>
<script src="plugins/datatables-bs4/js/dataTables.bootstrap4.min.js"></script>
<script src="plugins/datatables-responsive/js/dataTables.responsive.min.js"></script>
<script src="plugins/datatables-responsive/js/responsive.bootstrap4.min.js"></script>
<script src="plugins/datatables-buttons/js/dataTables.buttons.min.js"></script>
<script src="plugins/datatables-buttons/js/buttons.bootstrap4.min.js"></script>
<script src="plugins/jszip/jszip.min.js"></script>
<script src="plugins/pdfmake/pdfmake.min.js"></script>
<script src="plugins/pdfmake/vfs_fonts.js"></script>
<script src="plugins/datatables-buttons/js/buttons.html5.min.js"></script>
<script src="plugins/datatables-buttons/js/buttons.print.min.js"></script>
<script src="plugins/datatables-buttons/js/buttons.colVis.min.js"></script>

<!-- Bootstrap Datepicker -->
<script src="plugins/bootstrap-datepicker-thai-thai/js/bootstrap-datepicker.js"></script>
<script src="plugins/bootstrap-datepicker-thai-thai/js/bootstrap-datepicker-thai.js"></script>
<script src="plugins/bootstrap-datepicker-thai-thai/js/locales/bootstrap-datepicker.th.js"></script>
<!-- pace-progress -->
<script src="plugins/pace-progress/pace.min.js"></script>
<!-- Select2 -->
<script src="plugins/select2/js/select2.full.min.js"></script>

<script>
  document.getElementById("breadcrumb-item").innerHTML = "<?php echo $title_page; ?>";
  $(function() {
  
    $(".datethai").datepicker({
      language: 'th-th',
      format: 'dd-mm-yyyy',
      autoclose: true,
      clearBtn: true
    });


    $('#khet_code').select2({
      placeholder: 'เลือกสหวิทยาเขต',
      theme: 'bootstrap4'
    });
    $('#school_province').select2({
      placeholder: 'เลือกจังหวัด',
      theme: 'bootstrap4'
    });
    $('#school_size').select2({
      placeholder: 'เลือกขนาดโรงเรียน',
      theme: 'bootstrap4'
    });
  });
  // $('#birthday').datepicker({
  //   format: 'yyyy-mm-dd'
  // });
  // $('#teach_date').datepicker({
  //   format: 'yyyy-mm-dd'
  // });


  $(document).ready(function() {
    $('.select2bs4').select2({
      theme: 'bootstrap4'
    })
    $('#data').DataTable({

      "oLanguage": {
        "sLengthMenu": "แสดง _MENU_ แถว ต่อหน้า",
        "sZeroRecords": "ไม่พบข้อมูลที่ค้นหา",
        "sInfo": "แสดง _START_ ถึง _END_ จาก _TOTAL_ แถว",
        "sInfoEmpty": "แสดง 0 ถึง 0 จาก 0 แถว",
        "sInfoFiltered": "(จากแถวทั้งหมด _MAX_ แถว)",
        "ordering": "true :",
        "sSearch": "ค้นหา :",
        "oPaginate": {
          "sFirst": "เริ่มต้น",
          "sPrevious": "ก่อนหน้า",
          "sNext": "ถัดไป",
          "sLast": "สุดท้าย",
        },
        "buttons": {
          "collection": "ชุดข้อมูล",
          "colvis": "การมองเห็นคอลัมน์",
          "colvisRestore": "เรียกคืนการมองเห็น",
          "copy": "คัดลอก",
          "copyKeys": "กดปุ่ม Ctrl หรือ Command + C เพื่อคัดลอกข้อมูลบนตารางไปยัง Clipboard ที่เครื่องของคุณ",
          "copySuccess": {
            "_": "คัดลอกช้อมูลแล้ว จำนวน %d แถว",
            "1": "คัดลอกข้อมูลแล้ว จำนวน 1 แถว"
          },
          "copyTitle": "คัดลอกไปยังคลิปบอร์ด",
          "csv": "CSV",
          "excel": "Excel",
          "pageLength": {
            "_": "แสดงข้อมูล %d แถว",
            "-1": "แสดงข้อมูลทั้งหมด"
          },
          "pdf": "PDF",
          "print": "สั่งพิมพ์"
        },
      },

      "lengthMenu": [
        [25, 50, 75, 100, -1],
        [25, 50, 75, 100, "All"]
      ],
      "paging": true,
      "responsive": true,
      "lengthChange": true,
      "autoWidth": false,
      "ordering": true,
      "order": [],
      "buttons": ["copy", "csv", "excel", "pdf", "print", "colvis"]
    }).buttons().container().appendTo('#data_wrapper .col-md-6:eq(0)');
  });
  $('.summernote').summernote({
    height: 250
  });

  $('.notemini').summernote({
    height: 250,
    shortcuts: false,
    maxTextLength: 100000,
    toolbar: [
      // [groupName, [list of button]]
      ['style', ['bold', 'italic', 'underline', 'forecolor', 'clear']],
      ['para', ['ul', 'ol', 'paragraph']],
      ['misc', ['undo', 'redo']],
      ['view', ['fullscreen', 'codeview', 'help']],

    ],
    callbacks: {
      onImageUpload: function(data) {
        console.log(data)
        data.pop();
      }
    }
  });
</script>