<!DOCTYPE html>
<html>

<head>
    <meta charset='utf-8'>
    <meta http-equiv='X-UA-Compatible' content='IE=edge'>
    <title>Page Title</title>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <link rel='stylesheet' type='text/css' media='screen' href='main.css'>
    <script src='main.js'></script>
</head>
<style>
    /*===sweet alertbox css===*/
    @import "https://cdn.jsdelivr.net/npm/sweetalert2@10.10.1/dist/sweetalert2.min.css";

    /*=End sweet alertbox css=*/
    /* ========#FONT========= */
    .font-robo {
        font-family: "Roboto", "Arial", "Helvetica Neue", sans-serif;
    }

    .font-poppins {
        font-family: "Poppins", "Arial", "Helvetica Neue", sans-serif;
    }

    /*========#GRID========== */
    .row {
        display: -webkit-box;
        display: -webkit-flex;
        display: -moz-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
    }

    .row-space {
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -moz-box-pack: justify;
        -ms-flex-pack: justify;
        justify-content: space-between;
    }

    .col-2 {
        width: -webkit-calc((100% - 30px) / 2);
        width: -moz-calc((100% - 30px) / 2);
        width: calc((100% - 30px) / 2);
    }

    @media (max-width: 767px) {
        .col-2 {
            width: 100%;
        }
    }

    /* ==========================================================================
   #BOX-SIZING
   ========================================================================== */
    /**
 * More sensible default box-sizing:
 * css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice
 */
    html {
        -webkit-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
    }

    * {
        padding: 0;
        margin: 0;
    }

    *,
    *:before,
    *:after {
        -webkit-box-sizing: inherit;
        -moz-box-sizing: inherit;
        box-sizing: inherit;
    }

    /* ==========================================================================
   #RESET
   ========================================================================== */
    /**
 * A very simple reset that sits on top of Normalize.css.
 */
    body,
    h2,
    h3,
    h4,
    h5,
    h6,
    blockquote,
    p,
    pre,
    dl,
    dd,
    ol,
    ul,
    figure,
    hr,
    fieldset,
    legend {
        margin: 0;
        padding: 0;
    }

    /**
 * Remove trailing margins from nested lists.
 */
    li>ol,
    li>ul {
        margin-bottom: 0;
    }

    /**
 * Remove default table spacing.
 */
    table {
        border-collapse: collapse;
        border-spacing: 0;
    }

    /**
 * 1. Reset Chrome and Firefox behaviour which sets a `min-width: min-content;`
 *    on fieldsets.
 */
    fieldset {
        min-width: 0;
        /* [1] */
        border: 0;
    }

    button {
        outline: none;
        background: none;
        border: none;
    }

    /* ==========================================================================
   #PAGE WRAPPER
   ========================================================================== */
    .page-wrapper {
        min-height: 100vh;
    }

    body {
        font-family: "Poppins", "Arial", "Helvetica Neue", sans-serif;
        font-weight: 400;
        font-size: 14px;
    }

    h2,
    h3,
    h4,
    h5,
    h6 {
        font-weight: 400;
    }



    h2 {
        font-size: 30px;
    }

    h3 {
        font-size: 24px;
    }

    h4 {
        font-size: 18px;
    }

    h5 {
        font-size: 15px;
    }

    h6 {
        font-size: 13px;
    }

    /* ==========================================================================
   #BACKGROUND
   ========================================================================== */
    .bg-blue {
        background: #2c6ed5;
    }

    .bg-red {
        background: #fa4251;
    }

    .bg-gra-01 {
        background: -webkit-gradient(linear, left bottom, left top, from(#fbc2eb), to(#a18cd1));
        background: -webkit-linear-gradient(bottom, #fbc2eb 0%, #a18cd1 100%);
        background: -moz-linear-gradient(bottom, #fbc2eb 0%, #a18cd1 100%);
        background: -o-linear-gradient(bottom, #fbc2eb 0%, #a18cd1 100%);
        background: linear-gradient(to top, #fbc2eb 0%, #a18cd1 100%);
    }

    .bg-gra-02 {
        background-color: #66647d;

        background-attachment: fixed;

    }

    /* ==========================================================================
   #SPACING
   ========================================================================== */
    .p-t-100 {
        padding-top: 100px;
    }

    .p-t-130 {
        padding-top: 20px;
    }

    .p-t-180 {
        padding-top: 180px;
    }

    .p-t-20 {
        padding-top: 20px;
    }

    .p-t-15 {
        padding-top: 15px;
    }

    .p-t-10 {
        padding-top: 10px;
    }

    .p-t-30 {
        padding-top: 30px;
    }

    .p-b-100 {
        padding-bottom: 100px;
    }

    .m-r-45 {
        margin-right: 45px;
    }

    /* ==========================================================================
   #WRAPPER
   ========================================================================== */
    .wrapper {
        margin: 0 auto;
    }

    .wrapper--w960 {
        max-width: 960px;
    }

    .wrapper--w780 {
        max-width: 780px;
    }

    .wrapper--w680 {
        max-width: 680px;
    }

    /* ==========================================================================
   #BUTTON
   ========================================================================== */
    .btn {
        display: inline-block;
        line-height: 50px;
        padding: 0 50px;
        -webkit-transition: all 0.4s ease;
        -o-transition: all 0.4s ease;
        -moz-transition: all 0.4s ease;
        transition: all 0.4s ease;
        cursor: pointer;
        font-size: 18px;
        color: #fff;
        font-family: "Poppins", "Arial", "Helvetica Neue", sans-serif;
    }

    .btn--radius {
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
    }

    .btn--radius-2 {
        -webkit-border-radius: 5px;
        -moz-border-radius: 5px;
        border-radius: 5px;
    }

    .btn--pill {
        -webkit-border-radius: 20px;
        -moz-border-radius: 20px;
        border-radius: 20px;
    }

    .btn--green {
        background: #57b846;
    }

    .btn--green:hover {
        background: #4dae3c;
    }

    .btn--blue {
        background: #4272d7;
    }

    .btn--blue:hover {
        background: #3868cd;
    }

    /* ==========================================================================
   #DATE PICKER
   ========================================================================== */
    td.active {
        background-color: #2c6ed5;
    }

    input[type="date" i] {
        padding: 14px;
    }

    .table-condensed td,
    .table-condensed th {
        font-size: 14px;
        font-family: "Roboto", "Arial", "Helvetica Neue", sans-serif;
        font-weight: 400;
    }

    .daterangepicker td {
        width: 40px;
        height: 30px;
    }

    .daterangepicker {
        border: none;
        -webkit-box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        -moz-box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        display: none;
        border: 1px solid #e0e0e0;
        margin-top: 5px;
    }

    .daterangepicker::after,
    .daterangepicker::before {
        display: none;
    }

    .daterangepicker thead tr th {
        padding: 10px 0;
    }

    .daterangepicker .table-condensed th select {
        border: 1px solid #ccc;
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        font-size: 14px;
        padding: 5px;
        outline: none;
    }

    /* ==========================================================================
   #FORM
   ========================================================================== */
    input {
        outline: none;
        margin: 0;
        border: none;
        -webkit-box-shadow: none;
        -moz-box-shadow: none;
        box-shadow: none;
        width: 100%;
        font-size: 16px;
        font-family: inherit;
        background-color: #e4ffdf;
    }

    .input--style-4 {
        line-height: 35px;
        background: #e4ffdf;
        -webkit-box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        -moz-box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        -webkit-border-radius: 5px;
        -moz-border-radius: 5px;
        border-radius: 5px;
        padding: 0 20px;
        font-size: 16px;
        color: #666;
        -webkit-transition: all 0.4s ease;
        -o-transition: all 0.4s ease;
        -moz-transition: all 0.4s ease;
        transition: all 0.4s ease;
    }

    .input--style-4::-webkit-input-placeholder {
        /* WebKit, Blink, Edge */
        color: #666;
    }

    .input--style-4:-moz-placeholder {
        /* Mozilla Firefox 4 to 18 */
        color: #666;
        opacity: 1;
    }

    .input--style-4::-moz-placeholder {
        /* Mozilla Firefox 19+ */
        color: #666;
        opacity: 1;
    }

    .input--style-4:-ms-input-placeholder {
        /* Internet Explorer 10-11 */
        color: #666;
    }

    .input--style-4:-ms-input-placeholder {
        /* Microsoft Edge */
        color: #666;
    }

    .label {
        font-size: 16px;
        color: rgb(0, 0, 0);
        text-transform: capitalize;
        display: block;
        margin-bottom: 5px;
    }

    .radio-container {
        display: inline-block;
        position: relative;
        padding-left: 30px;
        cursor: pointer;
        font-size: 16px;
        color: #666;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .radio-container input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
    }

    .radio-container input:checked~.checkmark {
        background-color: #e5e5e5;
    }

    .radio-container input:checked~.checkmark:after {
        display: block;
    }

    .radio-container .checkmark:after {
        top: 50%;
        left: 50%;
        -webkit-transform: translate(-50%, -50%);
        -moz-transform: translate(-50%, -50%);
        -ms-transform: translate(-50%, -50%);
        -o-transform: translate(-50%, -50%);
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        -webkit-border-radius: 50%;
        -moz-border-radius: 50%;
        border-radius: 50%;
        background: #57b846;
    }

    .checkmark {
        position: absolute;
        top: 50%;
        -webkit-transform: translateY(-50%);
        -moz-transform: translateY(-50%);
        -ms-transform: translateY(-50%);
        -o-transform: translateY(-50%);
        transform: translateY(-50%);
        left: 0;
        height: 20px;
        width: 20px;
        background-color: #e5e5e5;
        -webkit-border-radius: 50%;
        -moz-border-radius: 50%;
        border-radius: 50%;
        -webkit-box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        -moz-box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
    }

    .checkmark:after {
        content: "";
        position: absolute;
        display: none;
    }

    .input-group {
        position: relative;
        margin-bottom: 5px;
    }

    .input-group-icon {
        position: relative;
    }

    .input-icon {
        position: absolute;
        font-size: 18px;
        color: #999;
        right: 18px;
        top: 50%;
        -webkit-transform: translateY(-50%);
        -moz-transform: translateY(-50%);
        -ms-transform: translateY(-50%);
        -o-transform: translateY(-50%);
        transform: translateY(-50%);
        cursor: pointer;
    }

    /* ==========================================================================
   #SELECT2
   ========================================================================== */
    .select--no-search .select2-search {
        display: none !important;
    }

    .rs-select2 .select2-container {
        width: 100% !important;
        outline: none;
        background: #fafafa;
        -webkit-box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        -moz-box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        box-shadow: inset 0px 1px 3px 0px rgba(0, 0, 0, 0.08);
        -webkit-border-radius: 5px;
        -moz-border-radius: 5px;
        border-radius: 5px;
    }

    .rs-select2 .select2-container .select2-selection--single {
        outline: none;
        border: none;
        height: 50px;
        background: transparent;
    }

    .rs-select2 .select2-container .select2-selection--single .select2-selection__rendered {
        line-height: 50px;
        padding-left: 0;
        color: #555;
        font-size: 16px;
        font-family: inherit;
        padding-left: 22px;
        padding-right: 50px;
    }

    .rs-select2 .select2-container .select2-selection--single .select2-selection__arrow {
        height: 50px;
        right: 20px;
        display: -webkit-box;
        display: -webkit-flex;
        display: -moz-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -moz-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -webkit-align-items: center;
        -moz-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .rs-select2 .select2-container .select2-selection--single .select2-selection__arrow b {
        display: none;
    }

    .rs-select2 .select2-container .select2-selection--single .select2-selection__arrow:after {
        font-family: "Material-Design-Iconic-Font";
        content: '\f2f9';
        font-size: 24px;
        color: #999;
        -webkit-transition: all 0.4s ease;
        -o-transition: all 0.4s ease;
        -moz-transition: all 0.4s ease;
        transition: all 0.4s ease;
    }

    .rs-select2 .select2-container.select2-container--open .select2-selection--single .select2-selection__arrow::after {
        -webkit-transform: rotate(-180deg);
        -moz-transform: rotate(-180deg);
        -ms-transform: rotate(-180deg);
        -o-transform: rotate(-180deg);
        transform: rotate(-180deg);
    }

    .select2-container--open .select2-dropdown--below {
        border: none;
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        -webkit-box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        -moz-box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        border: 1px solid #e0e0e0;
        margin-top: 5px;
        overflow: hidden;
    }

    .select2-container--default .select2-results__option {
        padding-left: 22px;
    }

    /* ==========================================================================
   #TITLE
   ========================================================================== */
    .title {
        font-size: 24px;
        color: #12009a;
        font-weight: 400;
        margin-bottom: 40px;
    }

    /* ==========================================================================
   #CARD
   ========================================================================== */
    .card {
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        background: #fff;
    }

    .card-4 {
        background: #fff;
        -webkit-border-radius: 10px;
        -moz-border-radius: 10px;
        border-radius: 10px;
        -webkit-box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        -moz-box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        box-shadow: 0px 8px 20px 0px rgba(0, 0, 0, 0.15);
        position: relative;
    }

    .card-4 .card-body {
        padding: 30px 20px;
        padding-bottom: 20px;
    }

    @media (max-width: 767px) {
        .card-4 .card-body {
            padding: 50px 40px;
        }
    }
</style>

<body>
    <div class="background">

        <div class="page-wrapper bg-gra-02 p-t-130 p-b-100 font-poppins">
            <div class="wrapper wrapper--w680">
                <div class="card card-4">
                    <div class="card-body">
                        <h2 class="title">Test ดึงบัตรประชาชน</h2>
                        <form method="POST">
                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="" style="width: 100%;">
                                        <div class="input-group">
                                            <label class="label">เจ้าหน้าที่ดำเนินการ</label>
                                            <select class="input--style-4" name="officer" id="officer">
                                                <option value="เจ้าหน้าที่">กรุณาเลือกเจ้าหน้าที่ดำเนินการ</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">เลขที่หนังสือ</label>
                                        <input class="input--style-4" type="text" name="docNo" id="docNo" required>
                                    </div>
                                </div>
                            </div>
                            <hr noshade=""><br>
                            <div class="row row-space">
                                <div class="col-2">
                                    <button class="btn btn--radius-2 btn--blue" type="button" onclick="getCardData()">ดึงข้อมูลจากบัตรประชาชน</button>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">สำนักทะเบียนท้องถิ่น ที่ออกบัตร</label>
                                        <input class="input--style-4" type="text" name="cardplace" id="cardplace" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row row-space">
                                <div class="" style="width: 100%;">
                                    <div class="input-group">
                                        <label class="label">ชื่อ-สกุล ผู้ร้อง <b>(ผู้ร้อง)</b></label>
                                        <input class="input--style-4" type="text" name="full_name" id="full_name" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row row-space">
                                <div class="" style="width: 100%;">
                                    <div class="input-group">
                                        <label class="label">ถ่ายภาพการทำลายพินัยกรรม<b>รูปถ่ายที่ 1</b></label>
                                        <input class="input--style-4" type="file" name="file_pic" id="file_pic" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row row-space">
                                <div class="" style="width: 100%;">
                                    <div class="input-group">
                                        <label class="label">ถ่ายภาพการทำลายพินัยกรรม<b>รูปถ่ายที่ 2</b></label>
                                        <input class="input--style-4" type="file" name="file_pic2" id="file_pic2" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">วัน/เดือน/ปี/เกิด</label>
                                        <div class="input-group-icon">
                                            <input type="text" class="datepicker-th-2" id="birthday" name="date1" value="ClickHere" />
                                            <i class="zmdi zmdi-calendar-note input-icon js-btn-calendar"></i>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">จังหวัดที่เกิด</label>
                                        <input class="input--style-4" type="text" name="birth_province" id="birth_province">
                                    </div>
                                </div>
                            </div>

                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">ชื่อบิดา</label>
                                        <input class="input--style-4" type="text" name="father" id="father">
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">ชื่อมารดา</label>
                                        <input class="input--style-4" type="text" name="mother" id="mother">
                                    </div>
                                </div>
                            </div>

                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">อยู่บ้านเลขที่</label>
                                        <input class="input--style-4" type="text" name="addresss" id="addresss">
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">หมู่ที่</label>
                                        <input class="input--style-4" type="text" name="moo" id="moo">
                                    </div>
                                </div>
                            </div>

                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">ตรอก/ซอย/ถนน</label>
                                        <input class="input--style-4" type="text" name="road" id="road">
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">ตำบล/แขวง</label>
                                        <input class="input--style-4" type="text" name="tambol" id="tambol">
                                    </div>
                                </div>
                            </div>

                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">อำเภอ/เขต</label>
                                        <input class="input--style-4" type="text" name="district" id="district">
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">จังหวัด</label>
                                        <input class="input--style-4" type="text" name="provice" id="provice">
                                    </div>
                                </div>
                            </div>

                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">เพศ</label>
                                        <input class="input--style-4" type="text" name="sex" id="sex">
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">บัตรประจำตัวประชาชน</label>
                                        <input class="input--style-4" type="number" name="card" id="card">
                                    </div>
                                </div>
                            </div>

                            <div class="row row-space">
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">วันออกบัตร</label>
                                        <div class="input-group-icon">
                                            <input type="text" class="datepicker-th-2" id="init-card" name="date1" value="ClickHere" />
                                            <i class="zmdi zmdi-calendar-note input-icon js-btn-calendar"></i>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="input-group">
                                        <label class="label">บัตรหมดอายุ</label>
                                        <div class="input-group-icon">
                                            <input type="text" class="datepicker-th-2" id="exp-card" name="date1" value="ClickHere" />
                                            <i class="zmdi zmdi-calendar-note input-icon js-btn-calendar"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr noshade=""><br>

                            <div class="row row-space">
                                <div class="p-t-15">
                                    <button class="btn btn--radius-2 btn--blue" type="button" onclick="generate()">Submit</button>
                                </div>

                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="https://pokkrong-2409a.web.app/js/docxtemplater.js"></script>
    <script src="https://pokkrong-2409a.web.app/js/jszip.js"></script>
    <script src="https://pokkrong-2409a.web.app/js/FileSaver.js"></script>
    <script src="https://pokkrong-2409a.web.app/js/jszip-utils.js"></script>
    <script>
        function getCardData() {
            console.log("function is Clicked working")

            //***import SweetAlert js into html*****  
            var script = document.createElement("script");
            script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@10.10.1/dist/sweetalert2.all.min.js'
            document.body.appendChild(script)
            //***END import js into html*****
            fetch('https://localhost:8182/thaiid/read.jsonp?&section1=true&section2a=true&section2b=true')

                .then(response => response.text())
                .then(data => {
                    var idcard = data
                    var x = idcard.substring(13, idcard.length - 1) //ตัดอักษรหน้า13 ตัดหลัง1
                    console.log(x)
                    const obj = JSON.parse(x);
                    console.log(obj)

                    if (obj == null) {
                        //alert('ตรวจสอบ บัตรประชาชนเสียบแล้ว หรือไม่??')
                        Swal.fire(
                            'ตรวจไม่พบบัตรประชาชน?',
                            'ตรวจสอบว่าเสียบบัตรประชาชนแล้วหรือยัง? หรือใช้ยางลบ ลบบริเวณหน้าสัมผัสของบัตรประชาชน',
                            'question'
                        )
                    } else {
                        //alert('รอสักครู่!! กำลังอ่านบัตรประชาชน ')
                        Swal.fire({
                            title: "กำลังอ่านบัตรประชาชน",
                            text: "กรุณารอสักครู่",
                            position: "center",
                            background: "white",
                            icon: 'success',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            allowEnterKey: false,
                            showConfirmButton: false,
                            showCancelButton: false,
                            timer: 2000,
                            backdrop: `
                rgba(0,0,123,0.4)
                url("https://sweetalert2.github.io/images/nyan-cat.gif")
                left top
                no-repeat
                `
                        })
                        var dateOfBirth = getFormatedDateOfBirth(obj.BirthDate)
                        var issueDate = getFormatedDateOfBirth(obj.IssueDate)
                        var expDate = getFormatedDateOfBirth(obj.ExpiryDate)
                        let preN = obj.TitleNameTh
                        var repreN = preN.replace(/น.ส./g, "นางสาว")
                        document.getElementById("full_name").value = repreN + obj.FirstNameTh + " " + obj.LastNameTh
                        document.getElementById("birthday").value = dateOfBirth
                        document.getElementById("card").value = obj.CitizenNo
                        document.getElementById("init-card").value = issueDate
                        document.getElementById("exp-card").value = expDate
                        document.getElementById("addresss").value = obj.HomeNo
                        document.getElementById("moo").value = obj.Moo.substring(7) //ตัดคำว่า หมู่ที่ ออก
                        document.getElementById("road").value = obj.Trok + obj.Soi + obj.Road
                        document.getElementById("tambol").value = obj.Tumbol
                        document.getElementById("district").value = obj.Amphur
                        document.getElementById('provice').value = obj.Province
                        document.getElementById('sex').value = obj.Gender
                        var IssuePlace = obj.IssuePlace
                        IssuePlaceArray = IssuePlace.split("/")
                        var CardPlace = IssuePlaceArray[0] + " " + IssuePlaceArray[1]
                        document.getElementById("cardplace").value = CardPlace
                    }
                })
                .catch(err => {
                    console.log('caught it!', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'คุณอาจยังไม่ติดตั้ง หรือ ลงโปรแกรม Smartdcard Reader หรือ ยังไม่เปิดใช้งาน Cors Unblock',
                        footer: '<a href="https://chrome.google.com/webstore/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino" traget="_blank">Download Cors Unblock</a>_And_<a href="https://drive.google.com/file/d/14SURlNUX9I3BBRMOT4S8GMM7TcwcfQw6/view" traget="_blank">Smartcard Reader</a>'
                    })

                })
        }
        ////////////////// Format Wording /////////////////
        function getFormatedDateOfBirth(dateOfBirth) {
            var year = dateOfBirth.slice(0, 4)
            var month = dateOfBirth.slice(4, 6)
            var date = dateOfBirth.slice(6, 8)

            return date + "/" + month + "/" + year
        }

        function getFormatedDateOfBirth(issueDate) {
            var yearIssue = issueDate.slice(0, 4)
            var monthIssue = issueDate.slice(4, 6)
            var dateIssue = issueDate.slice(6, 8)

            return dateIssue + "/" + monthIssue + "/" + yearIssue
        }

        function getFormatedDateOfBirth(expDate) {
            var yearExpire = expDate.slice(0, 4)
            var monthExpire = expDate.slice(4, 6)
            var dateExpire = expDate.slice(6, 8)

            return dateExpire + "/" + monthExpire + "/" + yearExpire
        }








        //**Generate document when Submit**//

        function loadFile(url, callback) {
            JSZipUtils.getBinaryContent(url, callback);
        }

        function generate() {

            loadFile("https://pokkrong-2409a.web.app/basedoc/testdoc.docx", function(error, content) {
                if (error) {
                    throw error
                };
                var zip = new JSZip(content);
                var doc = new window.docxtemplater().loadZip(zip)
                //ตัวแปร วัน เดือน ปี เกิด
                var birthday_v = document.getElementById("birthday").value.split("/");
                var birthday_v2 = document.getElementById("birthday").value;
                var b_date = parseInt(birthday_v[0]);
                var b_month = parseInt(birthday_v[1]);
                var b_year = birthday_v[2];
                var b_year_int = parseInt(b_year);

                //ตัวแปรวันที่ปัจจุบัน 
                var to_day = new Date();
                var thmonth = new Array("มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม");
                var dd = to_day.getDate();
                var mm = to_day.getMonth();
                var mmmm = parseInt(mm) + 1;
                var yy = to_day.getFullYear();
                var yyyy = to_day.getFullYear() + 543;
                var mmm = thmonth[to_day.getMonth()];
                var this_day = dd + ' ' + mmm + ' ' + yyyy;

                //วันออกบัตร
                var issue_c = document.getElementById("init-card").value.split("/");
                var issue_date = parseInt(issue_c[0]);
                var issue_month = issue_c[1];
                var issue_year = issue_c[2];
                var issue_m = parseInt(issue_month);
                var issue_year_int = parseInt(issue_year);
                var issue_mm = thmonth[issue_m - 1];
                var issue_card = issue_date + ' ' + issue_mm + ' ' + issue_year_int;

                //วันบัตรหมดอายุ
                var exp_c = document.getElementById("exp-card").value.split("/");
                var exp_date = parseInt(exp_c[0]);
                var exp_month = parseInt(exp_c[1]);
                var exp_year = parseInt(exp_c[2]);
                var exp_mm = thmonth[exp_month - 1];
                if (exp_year == 9999) {
                    var exp_card = "ตลอดชีพ"
                } else {
                    var exp_card = exp_date + ' ' + exp_mm + ' ' + exp_year;
                }


                //AGE BY BIRTHDATE คำนวนอายุนับตามวันเกิด
                var age_in_years;
                if (b_month > mmmm) {
                    age_in_years = (yyyy - b_year_int) - 1;
                }
                if (b_month < mmmm) {
                    age_in_years = yyyy - b_year_int;
                }
                if (b_month == mmmm) {
                    if (b_date <= dd) {
                        age_in_years = yyyy - b_year_int;
                    } else age_in_years = (yyyy - b_year_int) - 1;
                }

                //ใส่ขีดให้เลขบัตรประชาชน
                var id_card = document.getElementById('card').value;
                var id_card_slice = id_card.substring(0, 1) + '-' + id_card.substring(1, 5) + '-' + id_card.substring(5, 10) + '-' + id_card.substring(10, 12) + '-' + id_card.substring(12, 13);

                doc.setData({
                    //ตัวแปรข้อมูลในเอกสาร MS Word
                    full_name: document.getElementById("full_name").value,
                    b_date: b_date,
                    b_month: b_month,
                    b_year: b_year_int,
                    tday: this_day,
                    birth_province: document.getElementById("birth_province").value,
                    age: age_in_years,
                    father: document.getElementById("father").value,
                    mother: document.getElementById("mother").value,
                    addresss: document.getElementById("addresss").value,
                    moo: document.getElementById("moo").value,
                    road: document.getElementById("road").value,
                    tambol: document.getElementById("tambol").value,
                    district: document.getElementById("district").value,
                    provice: document.getElementById("provice").value,
                    job: document.getElementById("job").value,
                    card: id_card_slice,
                    officer: document.getElementById("officer").value,
                    init_card: issue_card,
                    exp_card: exp_card,
                    yyyy: yyyy,
                    docNo: document.getElementById("docNo").value,
                    cardplace: document.getElementById("cardplace").value,
                    file_pic: document.getElementById("file_pic").value,
                    file_pic2: document.getElementById("file_pic2").value

                });
                try {
                    // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
                    doc.render()
                } catch (error) {
                    var e = {
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                        properties: error.properties,
                    }
                    console.log(JSON.stringify({
                        error: e
                    }));
                    // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
                    throw error;
                }
                var out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                }) //Output the document using Data-URI
                saveAs(out, "output.docx")

            })
        }
    </script>

</body>

</html>