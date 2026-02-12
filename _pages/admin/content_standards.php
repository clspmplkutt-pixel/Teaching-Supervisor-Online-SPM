<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการมาตรฐานการเรียนรู้รายวิชา";
$tbl = "tbl_content_standards";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">
                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <a href="?module=content_standards" class="btn btn-block btn-success">มาตรฐานการเรียนรู้รายวิชาทั้งหมด</a>
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
                                echo "<option value=\"?module=content_standards&Teach_Subject=" . $row['teach_subject_id'] . "\"$select>" . $row['teach_subject'] . "</option>";
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
                        <a class="btn btn-block btn-info" href="?module=content_standards_add<?php echo $t; ?>">เพิ่มมาตรฐานการเรียนรู้</a>
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
                <div class="col-sm-12">

                </div>
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data" data-page-length='50'>
                        <thead>
                            <tr>
                                <th>id</th>
                                <th>รหัสสาระการเรียนรู้</th>
                                <th>กลุ่มสาระการเรียนรู้</th>
                                <th>สาระ</th>
                                <th>มาตรฐานการเรียนรู้</th>
                                <th>คำอธิบาย</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php

                            if (isset($Teach_Subject)) {
                                $result = $database->select($tbl, "*", ["strands_id[~]" => $Teach_Subject], ["ORDER" => ["strands_id" => "ASC", "content_s_name" => "ASC"]]);
                            } else {
                                $result = $database->select($tbl, "*", ["ORDER" => ["strands_id" => "ASC", "content_s_name" => "ASC"]]);
                            }
                            $i = 1;
                            foreach ($result as $row) {
                                $teach_subject = substr($row["strands_id"], 0, 4);
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $i; ?></td>
                                    <td class="text-center"><?php echo $row["strands_id"]; ?></td>
                                    <td class="text-center"><?php echo $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $teach_subject]); ?></td>
                                    <td><?php echo $database->get("tbl_strands", "strands_name", ["strands_id" => $row["strands_id"]]); ?></td>
                                    <td><?php echo $row["content_s_name"]; ?></td>
                                    <td><?php echo $row["content_s_detail"]; ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=content_standards_edit&id=<?php echo $row["id"]; ?>" class="btn btn-warning">แก้ไข</a>
                                            <!-- <a href="" class="btn btn-danger">ลบ</a> -->
                                        </div>
                                    </td>
                                </tr>
                            <?php
                                $i++;
                            } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>