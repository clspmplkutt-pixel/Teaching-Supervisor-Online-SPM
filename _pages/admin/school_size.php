<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ขนาดโรงเรียน";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>

            </div>
            <div class="card-body">
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ชื่อ</th>
                                <th>ความหมาย</th>
                                <th>จำนวน นร.น้อยสุด</th>
                                <th>จำนวน นร.มากสุด</th>
                                <th>Operator</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $result = $database->select("tbl_schoolsize","*");
                            foreach ($result as $row) {
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["schoolsize_id"]; ?></td>
                                    <td><?php echo $row["schoolsize_name"]; ?></td>
                                    <td><?php echo $row["schoolsize_details"]; ?></td>
                                    <td><?php echo $row["schoolsize_min"]; ?></td>
                                    <td><?php echo $row["schoolsize_max"]; ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=schoolsize_edit&schoolsize_id=<?php echo $row["schoolsize_id"]; ?>" class="btn btn-sm btn-warning"><i class="fa-regular fa-pen-to-square"></i>
                                                แก้ไข</a>
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
