<?php
session_start();

include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");
include_once("include/define.php");
$directory_include = "path";

// echo encrypt_decrypt("decrypt","b1pXZ0tiamFiY0lpN1dLbDZ1S2lNUT09");

if (isset($_POST['bt_send']) && isset($_POST['g-recaptcha-response'])) {
    $recaptcha_secret = reCAPTCHA_SECRET;
    $recaptcha_response = trim($_POST['g-recaptcha-response']);
    $recaptcha_remote_ip = $_SERVER['REMOTE_ADDR'];

    $recaptcha_api = "https://www.google.com/recaptcha/api/siteverify?" .
        http_build_query(
            array(
                'secret' => $recaptcha_secret,
                'response' => $recaptcha_response,
                'remoteip' => $recaptcha_remote_ip
            )
        );
    $response = json_decode(file_get_contents($recaptcha_api), true);
    /* reCapcha */

    if (isset($response) && $response['success'] == 1) { // ตรวจสอบสำเร็จ 

        $screen_resolution = $_COOKIE['sw'] . "*" . $_COOKIE['sh'];
        $txt_user = mysqli_escape_mimic($_POST['txt_user']);
        $txt_password = encrypt_decrypt("encrypt", mysqli_escape_mimic($_POST['txt_password']));
        $login_level = mysqli_escape_mimic($_POST['login_level']);

        $lastlog = date("Y-m-d H:i:s");

        // print_r($_POST);
        // exit;


        //เข้าสู่ระบบ ระดับ root และ admin ให้ตรวจสอบจากตาราง tbl_user
        if ($login_level == "root" || $login_level == "admin") {
            $result = $database->select("tbl_user", "*", [
                "user" => $txt_user,
                "passwd" => $txt_password,
                "level_id" => $login_level
            ]);

            if (count($result) == 1) {
                $_SESSION['level_id'] = $result[0]['level_id'];
                $_SESSION['user'] = $result[0]['user'];
                $_SESSION['name'] = $result[0]['name'];
                $_SESSION['time_login'] = date("Y-m-d H:i:s");

                if (DEBUG) {
                    setcookie('user', $result[0]['user'], time() + 3600 * 24, "/");
                } else {
                    setcookie('user', $result[0]['user'], time() + 3600, "/");
                }
                $database->update("tbl_user", ["lastlog" => $lastlog], ["user" => $result[0]['user']]);

                $data = $database->insert(
                    "tbl_log",
                    [
                        "user" => $_REQUEST['txt_user'],
                        "datetimein" => $lastlog,
                        "browser_name_regex" => $_SERVER['HTTP_USER_AGENT'],
                        "ipaddress" => GetIp(),
                        "level" => $result[0]['level_id'],
                        "screenresolution" => $screen_resolution
                    ]
                );

                location_to("index.php");
                exit(0);
            } else {
                //ไม่พบผู้ใช้งาน
                echo "ไม่พบผู้ใช้งาน";
                $database->update("tbl_user", ["hacker" => $lastlog], ["user" => $_REQUEST['txt_user']]);
                location_to("login.php?c=nouser");
                exit(0);
            }
        } elseif($login_level == "teacher" || $login_level == "headdepartment" || $login_level == "directorschool" || $login_level == "chairman" || $login_level == "supervisor" || $login_level == "districdirector" || $login_level == "supervision") {
            //เข้าระบบด้วยระดับอื่น (ครู, หัวหน้ากลุ่มสาระ, ผอ.+รอง ผอ., ประธานสหวิทยาเขต, ผู้นิเทศ, ศน., ผอ.เขต+รอง)

            // print_r($login_level);
            if ($login_level == "teacher") {
                //เข้าระบบด้วยระดับครู
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                ]);

            } elseif ($login_level == "headdepartment") {
                //เข้าระบบด้วยระดับหัวหน้ากลุ่มสาระ
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                    "headDepartment" => "1",
                    "status"=>"1"
                ]);
            } elseif ($login_level == "directorschool") {
                //เข้าระบบด้วยระดับผู้อำนวยการ/รองผู้อำนวยการ
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                    "level" => "directorschool",
                    "status"=>"1"
                ]);
            }elseif ($login_level == "chairman") {
                //เข้าระบบด้วยระดับประธานสหวิทยาเขต
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                    "level" => "directorschool",
                    "chairman" => "1",
                    "status"=>"1"
                ]);
            } elseif ($login_level == "supervisor") {
                //เข้าระบบด้วยระดับศึกษานิเทศ
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                    "level" => "supervisor",
                    "status"=>"1"
                ]);
            }elseif ($login_level == "districdirector") {
                //เข้าระบบด้วยระดับประธานสหวิทยาเขต
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                    "level" => "districdirector",
                    "status"=>"1"
                ]);
            }elseif ($login_level == "supervision") {
                //เข้าระบบด้วยระดับรหัสผู้นิเทศ
                $result = $database->select("tbl_Users", "*", [
                    "people_id" => $txt_user,
                    "passwd" => $txt_password,
                    "register_isConfirm" => "1",
                    "status"=>"1"
                ]);
            }

            $level = $login_level;
            $result = isset($result[0]) ? $result[0] : [];

            // print_r($result);
            // exit;

            if (count($result) != 0) {
                $_SESSION['level_id'] = $level;
                $_SESSION['user'] = $result['people_id'];
                $_SESSION['name'] = $database->get("tbl_system_prefix", "prefix", ["prefix_id" => $result['prefix']]) . $result['name'] . " " . $result['lastname'];
                
                $_SESSION['time_login'] = date("Y-m-d H:i:s");
                $_SESSION['school_code'] = $result['school'];
                if (DEBUG) {
                    setcookie('user', $result['people_id'], time() + 3600 * 24, "/");
                } else {
                    setcookie('user', $result['people_id'], time() + 3600, "/");
                }
                $database->update("tbl_Users", ["lastlogin" => $lastlog], ["people_id" => $result['people_id']]);
                $data = $database->insert(
                    "tbl_log",
                    [
                        "user" => $result['people_id'],
                        "datetimein" => $lastlog,
                        "browser_name_regex" => $_SERVER['HTTP_USER_AGENT'],
                        "ipaddress" => GetIp(),
                        "level" => $result['level'],
                        "screenresolution" => $screen_resolution
                    ]
                );
                location_to("index.php");
                exit;
            } elseif(count($result) == 0)  {
                //ไม่พบผู้ใช้งาน
                echo "ไม่พบผู้ใช้งาน";
                location_to("login.php?c=nouser");
            }
        }
    } else {
        echo "Access denied! กรุณายืนยันตัวตนว่าไม่ใช่ BOT";
        echo '<script>alert("ผิดพลาด");</script>';
        echo '<meta http-equiv="refresh" content="3;url=' . $url_main . '">';
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title><?php echo APP_NAME . " - " . AREA_NAME; ?> Version <?php echo APP_VERSION; ?></title>
    <!-- <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"> -->
    <!-- Tell the browser to be responsive to screen width -->
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Latest compiled and minified CSS -->
    <!-- <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css"> -->
    <link rel="stylesheet" href="plugins/bootstrap-5.3.0/css/bootstrap.min.css">
    <!-- <link rel="stylesheet" href="plugins/bootstrap-5.3.0/css/bootstrap-grid.min.css"> -->
    <!-- Font Awesome -->
    <link rel="stylesheet" href="plugins/fontawesome-free/640/css/all.min.css">
    <!-- Ionicons -->
    <!-- <link rel="stylesheet" href="https://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css"> -->
    <!-- icheck bootstrap -->
    <!-- <link rel="stylesheet" href="plugins/icheck-bootstrap/icheck-bootstrap.min.css"> -->
    <!-- Theme style -->
    <link rel="stylesheet" href="../dist/css/adminlte.min.css">
    <!-- Google Font: Source Sans Pro -->
    <link rel="stylesheet" href="include/fonts/Sarabun.css">

    <link rel="stylesheet" href="include/css/main.css">
    <link rel="stylesheet" href="/plugins/pace-progress/themes/orange/pace-theme-minimal.css">
    <?php include_once("images/fav/favicon.php"); ?>
    <script type=text/javascript>
    function setScreenHWCookie() {
        $.cookie('sw', screen.width);
        $.cookie('sh', screen.height);
        return true;
    }
    setScreenHWCookie();
</script>
</head>

<body class="hold-transition login-page pace-primary">
    <div class="login-box">
        <div class="login-logo">
            <image src="../images/<?php echo AREA_LOGO; ?>" width="125"><br>
        </div>
        <?php
        if (@addslashes($_GET['c']) == 'nouser') {
            echo '<div class="alert alert-danger alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' . "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้รับการยืนยันจากแอดมิน !" . '</div>';
        }
        ?>
        <div class="card">
            <div class="card-body login-card-body">
                <h4 class="login-box-msg text-danger">เข้าสู่ระบบ</h4>
                <form action="" method="post" role="form">
                    <div class="input-group mb-3">
                        <input type="text" class="form-control" placeholder="ชื่อผู้ใช้" name="txt_user" autofocus required autocomplete="false">
                        <div class="input-group-append">
                            <div class="input-group-text">
                                <span class="fas fa-user"></span>
                            </div>
                        </div>
                    </div>
                    <div class="input-group mb-3">
                        <input type="password" class="form-control" placeholder="รหัสผ่าน" name="txt_password" required autocomplete="false">
                        <div class="input-group-append">
                            <div class="input-group-text">
                                <span class="fas fa-lock"></span>
                            </div>
                        </div>
                    </div>
                    <div class="input-group mb-3">
                        <select name="login_level" id="login_level" class="custom-select">
                            <option value="">เลือกระดับการใช้งาน</option>
                            <?php
                            $rows = $database->select("tbl_TypeUser", "*", ["debug" => 0]);
                            foreach ($rows as $data) {
                                echo "<option value=\"" . $data['TypeUser'] . "\">" . $data['TypeUser_detail'] . "</option>";
                            }
                            if (DEBUG) {
                                $rows = $database->select("tbl_TypeUser", "*", ["debug" => 1]);
                                foreach ($rows as $data) {
                                    echo "<option value=\"" . $data['TypeUser'] . "\">" . $data['TypeUser_detail'] . "</option>";
                                }
                            } ?>
                        </select>
                    </div>
                    <div class="row justify-content-center mb-3">
                        <div class="col-12">
                            <div class="g-recaptcha" id="g-recaptcha" data-callback="makeaction" style="display: flex;justify-content: center;"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary btn-block" name="bt_send" id="btn_submit" disabled="disabled"><span class="fas fa-lock"></span> เข้าสู่ระบบ</button>
                            <a href="register_1.php" class="btn btn-danger btn-block"><i class="fas fa-user-plus"></i>
                                บุคลากรลงทะเบียน</a>
                        </div>

                    </div>
                    <p class="mb-0">

                    </p>
                </form>
            </div>
        </div>
        <div style="color:#CCC; text-align:center; padding-top:10px;">
            Version
            <?php echo APP_VERSION; ?>&nbsp;&copy;&nbsp;<?php echo date("Y"); ?><br><?php echo APP_NAME . " <br>" . AREA_NAME; ?><br>
            Developer : <a href=""> พัฒนาโดย ดร.อิทธิพงษ์ ตั้งสกุลเรืองไล<br>
                ศึกษานิเทศก์ชำนาญการพิเศษ สพม.พิษณุโลก อุตรดิตถ์
            </a>
        </div>
    </div>

    <!-- jQuery -->
    <script src="plugins/jquery/jquery.min.js"></script>
    <!-- Bootstrap 4 -->
    <script src="plugins/bootstrap/js/bootstrap.bundle.min.js"></script>
    <!-- AdminLTE App -->
    <script src="../dist/js/adminlte.min.js"></script>
    <script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit&hl=th"></script>
    <script src="/plugins/pace-progress/pace.min.js"></script>
</body>

</html>
<script type="text/javascript">
    var g_recapcha_id;
    var onloadCallback = function() {
        g_recapcha_id = grecaptcha.render(document.getElementById('g-recaptcha'), {
            'sitekey': '<?php echo reCAPTCHA_HTML; ?>'
        });
    };

    function makeaction() {
        document.getElementById('btn_submit').disabled = false;
    }
</script>