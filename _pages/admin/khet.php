<?php
$title_page = "จัดการสหวิทยาเขต";
?>
<script src="<?php echo $path_include; ?>/app.js"></script>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>

            </div>
            <div class="card-body">

                <div class="col-sm-12">
                    <span class="float-sm-right">
                        <a class="btn btn-outline-info" href="?module=khet_add"><i class="fa-solid fa-plus"></i> เพิ่มสหวิทยาเขต</a>
                    </span>
                </div>
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>รหัสสหวิทยาเขต</th>
                                <th>ชื่อสหวิทยาเขต</th>
                                <th>จังหวัด</th>
                                <th>Operator</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $result = $database->select("tbl_khet", "*", ["ORDER" => ["khet_code" => "ASC"]]);
                            foreach ($result as $row) {
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["khet_code"]; ?></td>
                                    <td><?php echo $row["khet_name"]; ?></td>
                                    <td><?php echo $arrayProvince[$row["khet_province"]]; ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=khet_edit&khet_code=<?php echo $row["khet_code"]; ?>" class="btn btn-sm btn-warning"><i class="fa-regular fa-pen-to-square"></i>
                                                แก้ไข</a>
                                            <a href="#" class="btn btn-sm btn-danger" onclick="Remove_Khet('<?php echo $row["khet_code"]; ?>')"><i class="fa-regular fa-trash-can"></i> ลบ</a>
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