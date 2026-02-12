<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการสาระการเรียนรู้รายวิชา";
$tbl = "tbl_strands";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">
                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <a href="?module=strands" class="btn btn-block btn-success">สาระการเรียนรู้รายวิชาทั้งหมด</a>
                    </div>
                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <select class="form-control form-select-lg" name="Teach_Subject" id="Teach_Subject" onchange="location.href = this.value;" required>
                            <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                            <?php
                            $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1"], ["ORDER" => ["teach_subject_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($Teach_Subject == $row['teach_subject_id']) {
                                    $select = "selected";
                                    $short_s = $row['teach_subject_short'];
                                } else {
                                    $select = "";
                                }
                                echo "<option value=\"?module=strands&Teach_Subject=" . $row['teach_subject_id'] . "\"$select>" . $row['teach_subject'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <?php
                        if (isset($Teach_Subject)) {
                            $t = "&Teach_Subject=$Teach_Subject";
                        } else {
                            $t = "";
                        }
                        ?>
                        <a class="btn btn-block btn-info" href="?module=strands_add<?php echo $t; ?>">เพิ่มสาระการเรียนรู้</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">

        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>

            </div>
            <div class="card-body">

                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data" data-page-length='50'>
                        <thead>
                            <tr>
                                <th>id</th>
                                <th>รหัสสาระการเรียนรู้</th>
                                <th>กลุ่มสาระการเรียนรู้</th>
                                <th>ลำดับที่</th>
                                <th>ชื่อสาระการเรียนรู้</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            if (isset($Teach_Subject)) {
                                $result = $database->select($tbl, "*", ["teach_subject_id" => $Teach_Subject], ["ORDER" => ["strands_id" => "ASC","id" => "ASC"]]);
                            } else {
                                $result = $database->select($tbl, "*", ["ORDER" => ["strands_id" => "ASC","id" => "ASC"]]);
                            }
                            foreach ($result as $row) {

                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["strands_id"]; ?></td>
                                    <td><?php echo $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $row["teach_subject_id"]]); ?></td>
                                    <td><?php echo $row["strands_order"]; ?></td>
                                    <td><?php echo $row["strands_name"]; ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=strands_edit&id=<?php echo $row["id"]; ?>" class="btn btn-warning">แก้ไข</a>
                                            <!-- <a href="" class="btn btn-danger">ลบ</a> -->
                                        </div>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>