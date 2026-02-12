<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการตัวชี้วัดรายวิชา";
$tbl = "tbl_indicators";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">
                    <div class="col-sm-12 col-md-1 col-xl-1 col-lg-1">
                        <?php
                        if (isset($teach_subject_id)) {
                            $t = "&teach_subject_id=$teach_subject_id";
                        } else {
                            $t = "";
                        }
                        ?>
                        <a class="btn btn-block btn-info" href="?module=indicators_add<?php echo $t; ?>">เพิ่มตัวชี้วัด</a>
                    </div>
                    <div class="col-sm-12 col-md-1 col-xl-1 col-lg-1">
                        <a href="?module=indicators" class="btn btn-block btn-success">ตัวชี้วัดทั้งหมด</a>
                    </div>


                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <select class="form-control form-select-lg" name="teach_subject_id" id="teach_subject_id" onchange="location.href = this.value;" required>
                            <option value="?module=indicators&grade_level_id=<?php echo $grade_level_id; ?>&indicator_id=<?php echo $indicator_id; ?>">เลือกกลุ่มสาระการเรียนรู้</option>
                            <?php
                            $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1"], ["ORDER" => ["teach_subject_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($teach_subject_id == $row['teach_subject_id']) {
                                    $select_1 = "selected";
                                } else {
                                    $select_1 = "";
                                }
                                echo "<option value=\"?module=indicators&teach_subject_id=" . $row['teach_subject_id'] . "&grade_level_id=$grade_level_id&indicator_id=$indicator_id\"$select_1>" . $row['teach_subject'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <select class="form-control form-select-lg" name="grade_level_id" id="grade_level_id" onchange="location.href = this.value;" required>
                            <option value="?module=indicators&teach_subject_id=<?php echo $teach_subject_id;?>&indicator_id=<?php echo $indicator_id; ?>">ระดับชั้น</option>
                            <?php
                            $data = $database->select("tbl_system_GradeLevel", "*", ["grade_level_status" => "1"], ["ORDER" => ["grade_level_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($grade_level_id == $row['grade_level_id']) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=indicators&teach_subject_id=$teach_subject_id&grade_level_id=" . $row['grade_level_id'] . "&indicator_id=$indicator_id\"$select_2>" . $row['grade_level_name'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <select class="form-control form-select-lg" name="tbl_type_indicators" id="tbl_type_indicators" onchange="location.href = this.value;" required>
                            <option value="?module=indicators&teach_subject_id=<?php echo $teach_subject_id;?>&grade_level_id=<?php echo $grade_level_id; ?>">ประเภทตัวชี้วัด</option>
                            <?php
                            $data = $database->select("tbl_type_indicators", "*", ["indicator_status" => "1"], ["ORDER" => ["indicator_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($indicator_id == $row['indicator_id']) {
                                    $select_3 = "selected";
                                } else {
                                    $select_3 = "";
                                }
                                echo "<option value=\"?module=indicators&teach_subject_id=$teach_subject_id&grade_level_id=$grade_level_id&indicator_id=" . $row['indicator_id'] . "\"$select_3>" . $row['indicator_name'] . "</option>";
                            }
                            ?>

                        </select>
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
                                <th>กลุ่มสาระ</th>
                                <th>ระดับชั้น</th>
                                <th>มาตรฐาน</th>
                                <th>กลุ่มที่</th>
                                <th>ตัวชี้วัด</th>
                                <th>ประเภท</th>
                                <th>คำอธิบาย</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $sql = "SELECT * FROM $tbl ";
                            if ($teach_subject_id == "" && $grade_level_id == "" && $indicator_id == "") {
                                $sql .= "ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }

                            if ($teach_subject_id != "" && $grade_level_id == "" && $indicator_id == "") {
                                $sql .= "WHERE teach_subject_id =$teach_subject_id ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }

                            if ($teach_subject_id == "" && $grade_level_id != "" && $indicator_id == "") {
                                $sql .= "WHERE grade_level_id =$grade_level_id ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }

                            if ($teach_subject_id == "" && $grade_level_id == "" && $indicator_id != "") {
                                $sql .= "WHERE indicator_id =$indicator_id  ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }
                            if ($teach_subject_id != "" && $grade_level_id != "" && $indicator_id == "") {
                                $sql .= "WHERE teach_subject_id =$teach_subject_id AND grade_level_id =$grade_level_id  ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }
                            if ($teach_subject_id != "" && $grade_level_id == "" && $indicator_id != "") {
                                $sql .= "WHERE teach_subject_id =$teach_subject_id AND indicator_id =$indicator_id  ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }
                            if ($teach_subject_id == "" && $grade_level_id != "" && $indicator_id != "") {
                                $sql .= "WHERE grade_level_id =$grade_level_id AND indicator_id =$indicator_id  ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }
                            if ($teach_subject_id != "" && $grade_level_id != "" && $indicator_id != "") {
                                $sql .= "WHERE teach_subject_id =$teach_subject_id AND grade_level_id =$grade_level_id AND indicator_id =$indicator_id  ORDER BY teach_subject_id ASC,indicator_group ASC,grade_level_id ASC,indicators_name ASC";
                            }
                            $data = $database->query($sql)->fetchAll();
                            foreach ($data as $row) {
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row['id']; ?></td>
                                    <td class="text-center"><?php echo $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $row['teach_subject_id']]); ?></td>
                                    <td class="text-center"><?php echo $database->get("tbl_system_GradeLevel", "grade_level_shortname", ["grade_level_id" => $row['grade_level_id']]); ?></td>
                                    <td class="text-center"><?php echo $row["content_s_name"]; ?></td>
                                    <td class="text-center"><?php echo $row["indicator_group"]; ?></td>
                                    <td class="text-center"><?php echo $row["indicators_name"]; ?></td>
                                    <td><?php echo $database->get("tbl_type_indicators", "indicator_name", ["indicator_id" => $row['indicator_id']]); ?></td>
                                    <td><?php echo $row["indicators_details"]; ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=indicators_edit&id=<?php echo $row["id"]; ?>" class="btn btn-warning">แก้ไข</a>
                                            <a href="" class="btn btn-danger">ลบ</a>
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