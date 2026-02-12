<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "แก้ไขข้อมูลมาตรฐานการเรียนรู้รายวิชา";
$tbl = "tbl_content_standards";
if ($operation == $module . "_save") {

    $content_s_detail = preg_replace("/\r|\n/", "", $content_s_detail);

    $content_standards_add = $database->update($tbl, [
        "content_s_detail" => $content_s_detail,
    ], ["id" => $id]);
    if ($content_standards_add->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=content_standards", "0");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=content_standards", "0");
    }
    exit;
}
$data = $database->get($tbl, "*", ["id" => $id]);
?>


<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <form action="?module=<?php echo $module; ?>" method="POST">
                    <div class="mb-3 mt-3">
                        <?php $teach_subject = substr($data["strands_id"], 0, 4); ?>
                        <label for="Teach_Subject">กลุ่มสาระการเรียนรู้: <?php echo $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $teach_subject]); ?></label>

                    </div>
                    <div class="mb-3">
                        <label for="strands_id">สาระการเรียนรู้: <?php echo $database->get("tbl_strands", "strands_name", ["strands_id" => $data['strands_id']]); ?></label>

                    </div>
                    <div class="mb-3">
                        <label for="content_s_name">ชื่อสาระการเรียนรู้: <?php echo $data['content_s_name']; ?></label>
                    </div>
                    <div class="mb-3">
                        <label for="content_s_detail">คำอธิบายมาตรฐานการเรียนรู้รายวิชา: <span class="text-danger">ไม่ต้องกดปุ่ม Enter เพื่อขึ้นบรรทัดใหม่</span></label>
                        <textarea name="content_s_detail" id="content_s_detail" cols="30" rows="10" class="form-control"><?php echo $data['content_s_detail']; ?></textarea>
                    </div>
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <input type="hidden" name="id" value="<?php echo $data['id']; ?>">
                        <a href="?module=content_standards" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function add_order(short, id) {
        id = id.substr(4, 1);
        document.getElementById("content_s_name").value = short + ' ' + id + '.';
    }
</script>