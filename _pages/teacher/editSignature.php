<?php
include_once("plugins/php-image-resize/lib/ImageResize.php");

use \Gumlet\ImageResize;


$title_page = "จัดการลายเซ็นต์";
$target_dir = "fileupload/signature/";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    //กำหนด Path ของไฟล์ที่จะ Upload


    $picture = $_FILES["profileSign"];

    //เตรียมชื่อไฟล์ใหม่
    $newfilename = $_POST['people_id'] . '_sign.' . pathinfo($picture["name"], PATHINFO_EXTENSION);
    //เตรียม Path สำหรับ Upload กับชื่อไฟล์ใหม่
    $target_file = $target_dir . $newfilename;
    $uploadOk = 1;

    //ตรวจสอบนามสกุลของไฟล์
    $imageFileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));

    // Check if image file is a actual image or fake image
    if ($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg") {
        echo "Sorry, only JPG, JPEG, PNG files are allowed.";
        $uploadOk = 0;
    }

    $check = getimagesize($picture["tmp_name"]);
    // echo "<pre>";
    // print_r($check);
    // echo "</pre>";
    // Check file size 
    if ($check !== false) {
        if ($check[1] > 300) {
            $ratio = (int)$check[0] / (int)$check[1];
            // echo "<h6>Ratio: " . $ratio . "</h6>";
            // exit;
            if ($ratio <= 1) {
                $uploadOk = 0;
                echo "<h2>กรุณาภาพอัพโหลดภาพแนวนอน</h2>";
            } else {
                $uploadOk = 1;
            }
        } else {
            $uploadOk = 0;
            echo "<h2 class=text-danger>ขนาดของไฟล์ ความกว้าง ไม่ควรน้อยกว่า 300 pixel (เป็น jpg หรือ PNG รูปภาพลายเซ็นต์)</h2>";
        }
    } else {
        echo "File is not an image.";
        $uploadOk = 0;
    }

    if ($uploadOk == 0) {
        echo "Sorry, your file was not uploaded.";
        echo '<META HTTP-EQUIV="Refresh" CONTENT="2;URL=?module=editSignature">';
        die();
        // if everything is ok, try to upload file
    } else {
        if ($_POST['user_action'] == 'update') {
            $image = new ImageResize($picture["tmp_name"]);
            $image->resizeToBestFit(150, 250);
            $image->save($target_file);
            $data = array(
                "signature" => $newfilename
            );


            $result = $database->update("tbl_Users", $data, ["people_id" => $_POST['people_id']]);
            echo '<script>Swal.fire("Update Success!","แก้ไขข้อมูลเรียบร้อยแล้ว!","success");</script>';
            echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จ</h1>";
            echo '<META HTTP-EQUIV="Refresh" CONTENT="2;URL=?module=editSignature">';
        }
        die();
    }
} else {
    $rows = $database->get("tbl_Users", "*", ["people_id" => $_SESSION['user']]);
    // print_r($rows);
}
?>
<div class="row">
    <div class="col-lg-6">

        <form name="frmMain" method="post" enctype="multipart/form-data" class="form-horizontal">
            <div class="card card-default">
                <div class="card-header bg-info">
                    <h3 class="card-title"><i class="fa-solid fa-book"></i> <?= $title_page ?></h3>
                </div>
                <div class="card-body">
                    <div class="col-lg-12 col-sm-12">
                        <div class="form-group text-center">
                            <label class="form-label text-center" for="profileSign"> <i class="fa-solid fa-book"></i> ไฟล์ภาพลายเซ็นต์</label>
                            <div class="custom-file">
                                <input class="form-control fileUploadPic" name='profileSign' id="profileSign" type="file" accept=".JPG,.PNG,.JPEG">

                                <div class="invalid-feedback">โปรดเลือกไฟล์</div>
                            </div>
                        </div>
                        <h2 class="text-danger">ขนาดของไฟล์ ความกว้าง ไม่ควรน้อยกว่า 300 pixel (เป็น jpg หรือ PNG รูปภาพลายเซ็นต์)</h2>
                    </div>
                </div>
                <input type="hidden" name="signature" value="<?php echo $rows['signature']; ?>">
                <div class="card-footer text-center">
                    <input type="hidden" name="id" value="<?php echo $rows['id']; ?>">
                    <input type="hidden" name="people_id" value="<?php echo $rows['people_id']; ?>">
                    <input type="hidden" name="user_action" value="update">
                    <button type="submit" name="edit" value="edit" class="btn btn-warning btn-pill btn-lg mr-2 mb-4 col-sm-12 ms-sm-auto d-grid"><i class="fa-solid fa-save"></i> แก้ไขข้อมูล</button>

                </div>
            </div>
        </form>
    </div>
    <div class="col-lg-6">
        <div class="card card-default">
            <div class="card-header bg-info">
                <h3 class="card-title"><i class="fa-solid fa-book"></i> ภาพลายเซ็นต์</h3>
            </div>
            <div class="card-body">
                <div class="col-lg-12 col-sm-12">
                    <div class="form-group text-center">
                        <?php
                        if ($rows['signature'] == "") {
                            echo "<h1 class=text-danger>กรุณาเพิ่มภาพลายเซ็นต์</h1>";
                        } elseif (file_exists($target_dir . "/" . $rows['signature'])) {
                            echo "<img src='./" . $target_dir . "/" . $rows['signature'] . "' alt='Image' >";
                        } else {
                            echo "<h1 class=text-danger>ไม่พบรูปภาพ</h1>";
                        }
                        ?>

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    $('.fileUploadPic').fileinput({
        theme: 'fa5',
        language: 'th',
        // uploadUrl: '#',
        allowedFileExtensions: ['jpg', 'png', 'gif','jpeg']
    });
</script>