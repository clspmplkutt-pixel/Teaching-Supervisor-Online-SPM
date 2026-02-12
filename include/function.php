<?php


$month_th = array(
    '01' => 'มกราคม',
    '02' => 'กุมภาพันธ์',
    '03' => 'มีนาคม',
    '04' => 'เมษายน',
    '05' => 'พฤษภาคม',
    '06' => 'มิถุนายน',
    '07' => 'กรกฎาคม',
    '08' => 'สิงหาคม',
    '09' => 'กันยายน',
    '10' => 'ตุลาคม',
    '11' => 'พฤศจิกายน',
    '12' => 'ธันวาคม',
);

$month_th_short = array(
    '01' => 'ม.ค.',
    '02' => 'ก.พ.',
    '03' => 'มี.ค.',
    '04' => 'เม.ย.',
    '05' => 'พ.ค.',
    '06' => 'มิ.ย.',
    '07' => 'ก.ค.',
    '08' => 'ส.ค.',
    '09' => 'ก.ย.',
    '10' => 'ต.ค.',
    '11' => 'พ.ย.',
    '12' => 'ธ.ค.',
);

$month_en = array(
    '01' => 'January',
    '02' => 'Febuary',
    '03' => 'Mars',
    '04' => 'April',
    '05' => 'May',
    '06' => 'June',
    '07' => 'July',
    '08' => 'August',
    '09' => 'September',
    '10' => 'October',
    '11' => 'November',
    '12' => 'December',
);

$month_en_short = array(
    '01' => 'Jan',
    '02' => 'Feb',
    '03' => 'Mar',
    '04' => 'Apr',
    '05' => 'May',
    '06' => 'Jun',
    '07' => 'Jul',
    '08' => 'Aug',
    '09' => 'Sep',
    '10' => 'Oct',
    '11' => 'Nov',
    '12' => 'Dec',
);

$day_th = array(
    '0' => 'อาทิตย์',
    '1' => 'จันทร์',
    '2' => 'อังคาร',
    '3' => 'พุธ',
    '4' => 'พฤหัสบดี',
    '5' => 'ศุกร์',
    '6' => 'เสาร์',
);

$day_short_th = array(
    '1' => 'จ.',
    '2' => 'อ.',
    '3' => 'พ.',
    '4' => 'พฤ.',
    '5' => 'ศ.',
    '6' => 'ส.',
    '7' => 'อา.',
);

$Use_status = array(
    "0" => "<span class=\"text-danger\">ไม่ใช้งาน</span>",
    "1" => "<span class=\"text-success\">ใช้งาน</span>",
);

$Select_status = array(
    "0" => "ไม่ใช้งาน",
    "1" => "ใช้งาน",
);

function school_size($student_count)
{
    global $database;
    $size = $database->get("tbl_schoolsize", "schoolsize_id", [
        "schoolsize_min[<=]" => $student_count,
        "schoolsize_max[>=]" => $student_count,
    ]);
    return $size;
}


//ฟังก์ชั่นแสดงวันที่เป็นภาษาไทย การส่งค่า ส่งเป็น YYYY-MM-DD
function brtospace($text)
{
    return str_replace(array("\r\n", "\r", "\n", "\t"), " ", $text);
}

function nltobr($text)
{
    return str_replace(array("\r\n", "\r", "\n"), "<br>", $text);
}

function sortarray($text)
{
    $text = explode(" ", trim($text));
    sort($text);
    return implode(" ", $text);
}

//แปลงคริสต์ศักราชเป็นพุทธศักราช
function thaiyear($txt)
{
    return ((int)$txt) + 543;
}

//แปลงพุทธศักราชเป็นคริสต์ศักราช
function enyear($txt)
{
    return ((int)$txt) - 543;
}
//แสดง Alert ข้อความ
function alert_t($txt)
{
    echo '<script type="text/JavaScript">alert('.$txt.');</script>';
}

function success_swal($txt,$url,$time){
    echo "<script>";
    echo "Swal.fire($txt);";
    echo "</script>";
}


//เปลี่ยน URL เป็นที่อยู่จริง
function location_to($url, $sleep = 0)
{
    // echo "<script>window.location.href='" . $url . "'</script>";
    echo "<META HTTP-EQUIV=\"Refresh\" CONTENT=\"$sleep;$url\">";
    header("location:" . $url);
}

//แปลงวันเป็นรูปแบบไทย อังกฤษ
//$date การส่งค่า ส่งเป็น YYYY-MM-DD
//$format   1   1 มกราคม พ.ศ. 2559
//          2   1 ม.ค. 2559
//          3   1 January 2016
//          4   1 Jan 2016
//          5   1 มกราคม 2559
//          6   วันศุกร์ที่ 1 เดือนมกราคม พ.ศ. 2559
function thai_date_full($date, $format = 1)
{
    global $month_th, $month_th_short, $month_en, $month_en_short, $day_th, $day_short_th;
    $e = explode('-', $date);
    if (substr($e[2], 0, 1) == '0') {
        $e[2] = substr($e[2], 1, 1);
    }
    switch ($format) {
        case '1':
            $e[0] = thaiyear($e[0]);
            return $e[2] . ' ' . $month_th[$e[1]] . ' พ.ศ. ' . $e[0];
            break;
        case '2':
            $e[0] = thaiyear($e[0]);
            return $e[2] . ' ' . $month_th_short[$e[1]] . ' ' . $e[0];
            break;
        case '3':
            return $e[2] . ' ' . $month_en[$e[1]] . ' ' . $e[0];
            break;
        case '4':
            return $e[2] . ' ' . $month_en_short[$e[1]] . ' ' . $e[0];
            break;
        case '5':
            $e[0] = thaiyear($e[0]);
            return $e[2] . ' ' . $month_th[$e[1]] . ' ' . $e[0];
            break;
        case '6':
            $e[0] = thaiyear($e[0]);
            return "วัน" . $day_th[date("w", strtotime($date))] . "ที่ " . $e[2] . " เดือน" . $month_th[$e[1]] . " พ.ศ. " . $e[0];
    }
}

function thai_date($date)
{
    global $month_th;
    $e = explode('-', $date);
    return $e[2] . ' ' . $month_th[$e[1]] . ' ' . $e[0];
}

/* ฟังก์ชั่นการตรวจสอบค่าที่รับจาก GET POST REQUES */
function test_input($text)
{
    $text = trim($text);
    $text = stripslashes($text);
    $text = htmlspecialchars($text);
    return $text;
}

function month_thai($d)
{
    global $month_th;
    if (substr(substr($d, 6, 2), 0, 1) == '0') {
        $day = substr(substr($d, 6, 2), -1);
    } else {
        $day = substr($d, 6, 2);
    }

    return $day . ' ' . $month_th[substr($d, 4, 2)] . ' ' . substr($d, 0, 4);
}

foreach ($_POST as $key => $value) {
    $$key = $value;
}

foreach ($_GET as $key => $value) {
    $$key = $value;
}

function CalPercent($total, $num, $decimal_length)
{
    if ($total == 0) {
        return 0;
    } else {
        $percent = ($num * 100) / $total;
        return number_format($percent, $decimal_length);
    }
}

function CalAverage($total, $num, $decimal_length)
{
    if ($total == 0) {
        return 0;
    } else {
        $average = $total / $num;
        return number_format($average, $decimal_length);
    }
}

//ตรวจสอบเลขประจำตัวประชาชน
function checkPID($pid)
{
    if (strlen($pid) != 13) {
        return false;
    }
    for ($i = 0, $sum = 0; $i < 12; ++$i) {
        $sum += (int)($pid[$i]) * (13 - $i);
    }
    if ((11 - ($sum % 11)) % 10 == (int)($pid[12])) {
        return true;
    }

    return false;
}


function LoginTransition($user, $status)
{
    global $link;
    $lastlogin = date("Y-m-d H:i:s");
    if ($status == "1") {
        $sql = "INSERT INTO " . tbl_prefix . "tbl_login_trans(user,lastlog,ipaddress,status) values('$user','" . $lastlogin . "','" . GetIp() . "','SUCCESS')";
    } elseif ($status == "0") {
        $sql = "INSERT INTO " . tbl_prefix . "tbl_login_trans(user,lastlog,ipaddress,status) values('$user','" . $lastlogin . "','" . GetIp() . "','FAIL')";
    }
    $link->query($sql);
}



function GetIp()
{
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        //check ip from share internet {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        //to check ip is pass from proxy {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    return $ip;
}

function mysqli_escape_mimic($inp)
{
    if (is_array($inp)) {
        return array_map(__METHOD__, $inp);
    }

    if (!empty($inp) && is_string($inp)) {
        return str_replace(array('\\', "\0", "\n", "\r", "'", '"', "\x1a"), array('\\\\', '\\0', '\\n', '\\r', "\\'", '\\"', '\\Z'), $inp);
    }

    return $inp;
}
function cv_year_th2en($str)
{
    if ($str != "") {
        //แปลงวันเดือนปี จาก พ.ศ. เป็น คศ. เพื่อเก็บลงฐานข้อมูล
        $array_th = explode("-", $str);
        $array_en = ((int)$array_th[2] - 543) . "-" . $array_th[1] . "-" . $array_th[0];
        return $array_en;
    } else {
        return null;
    }
}


function cv_year_en2th($str)
{
    if ($str != "") {
        //แปลงวันเดือนปี จาก ค.ศ. เป็น พศ. เพื่อแก้ไขข้อมูล
        $array_en = explode("-", $str);
        $array_th = $array_en[2] . "-" . $array_en[1] . "-" . ((int)$array_en[0] + 543);
        return $array_th;
    } else {
        return null;
    }
}

function remove_dash($str)
{
    //สำหรับเอาเครื่องหมาย - ออกจากเลขประจำตัวประชาชน
    if ($str != "") {
        $str_id = explode("-", $str);
        $str = $str_id[0] . $str_id[1] . $str_id[2] . $str_id[3] . $str_id[4];
        return $str;
    } else {
        return null;
    }
}
function add_dash($str)
{
    //สำหรับเติมเครื่องหมาย - ในเลขประจำตัวประชาชน
    if ($str != "") {
        return substr($str, 0, 1) . "-" . substr($str, 1, 4) . "-" . substr($str, 5, 5) . "-" . substr($str, 10, 2) . "-" . substr($str, 12, 1);
    } else {
        return null;
    }
}

function line_notify($Token, $message, $sticker_package = "", $stickerId = "")
{
    $lineapi = $Token; // ใส่ token key ที่ได้มา
    // $mms =  trim($message); // ข้อความที่ต้องการส่ง
    if ($sticker_package == "" && $stickerId == "") {
        $mms = array(
            'message' => trim($message), // ต้องส่งข้อความด้วยเสมอ ถ้าไม่มี ให้เว้นเป็นช่องว่าง
            'stickerPackageId' => $sticker_package,
            'stickerId' => $stickerId,
        );
    } else {
        $mms = array(
            'message' => trim($message), // ต้องส่งข้อความด้วยเสมอ ถ้าไม่มี ให้เว้นเป็นช่องว่าง
        );
    }
    date_default_timezone_set("Asia/Bangkok");
    $chOne = curl_init();
    curl_setopt($chOne, CURLOPT_URL, "https://notify-api.line.me/api/notify");
    // SSL USE
    curl_setopt($chOne, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($chOne, CURLOPT_SSL_VERIFYPEER, 0);
    //POST
    curl_setopt($chOne, CURLOPT_POST, 1);
    // curl_setopt( $chOne, CURLOPT_POSTFIELDS, "message=$mms");
    curl_setopt($chOne, CURLOPT_POSTFIELDS, http_build_query($mms));
    curl_setopt($chOne, CURLOPT_FOLLOWLOCATION, 1);
    $headers = array('Content-type: application/x-www-form-urlencoded', 'Authorization: Bearer ' . $lineapi . '');
    curl_setopt($chOne, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($chOne, CURLOPT_RETURNTRANSFER, 1);
    $result = curl_exec($chOne);
    //Check error
    if (curl_error($chOne)) {
        echo 'error:' . curl_error($chOne);
    } else {
        $result_ = json_decode($result, true);
        return $result_;
        // echo "{ \"status\" : \"" . $result_['status'] . "\",";
        // echo "\"message\" : \"" . $result_['message'] . "\" }";
    }
    curl_close($chOne);
}

// https://naveensnayak.wordpress.com/2013/03/12/simple-php-encrypt-and-decrypt/
function encrypt_decrypt($action, $string)
{
    global $secret_key, $secret_iv;
    $output = false;

    $encrypt_method = 'AES-256-CBC';
    // hash
    $key = hash('sha256', $secret_key);

    // iv - encrypt method AES-256-CBC expects 16 bytes - else you will get a warning
    $iv = substr(hash('sha256', $secret_iv), 0, 16);

    if ($action == 'encrypt') {
        $output = openssl_encrypt($string, $encrypt_method, $key, 0, $iv);
        $output = base64_encode($output);
    } elseif ($action == 'decrypt') {
        $output = openssl_decrypt(base64_decode($string), $encrypt_method, $key, 0, $iv);
    }

    return $output;
}

function randomPassword($length, $count, $characters)
{
    // $length - the length of the generated password
    // $count - number of passwords to be generated
    // $characters - types of characters to be used in the password
    // define variables used within the function
    $symbols = array();
    $pass_str = '';
    $used_symbols = '';
    $pass = '';

    // an array of different character types
    $symbols['lower_case'] = 'abcdefghijklmnopqrstuvwxyz';
    $symbols['upper_case'] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $symbols['numbers'] = '1234567890';
    $symbols['special_symbols'] = '!?~@#-_+<>[]{}';

    $characters = explode(',', $characters); // get characters types to be used for the passsword
    foreach ($characters as $key => $value) {
        $used_symbols .= $symbols[$value]; // build a string with all characters
    }
    $symbols_length = strlen($used_symbols) - 1; //strlen starts from 0 so to get number of characters deduct 1
    for ($p = 0; $p < $count; ++$p) {
        $pass = '';
        for ($i = 0; $i < $length; ++$i) {
            $n = rand(0, $symbols_length); // get a random character from the string with all characters
            $pass .= $used_symbols[$n]; // add the character to the password string
        }
        $pass_str .= $pass;
    }

    return $pass_str;
}

//ตรวจสอบเว็บปลายทางว่ายังอยู่หรือไม่
function UR_exists($url)
{
    $headers = get_headers($url);
    return stripos($headers[0], "200 OK") ? true : false;
}

//การหาค่า BMI
function Cal_BMI($height, $weight)
{
    if ($height == 0 || $weight == 0) {
        return 0;
    } else {
        $height = number_format($height / 100, 2);
        $BMI = $weight / ($height * $height);
        return number_format($BMI, 2);
    }
}

function get_string_between($string, $start, $end)
{
    preg_match_all('/' . preg_quote($start, '/') . '(.*?)' . preg_quote($end, '/') . '/', $string, $matches);
    return trim($matches[1][0]);
    //return $matches[1];
}

function format_size($bytes)
{
    if ($bytes < 1024) {
        return $bytes . ' B';
    } elseif ($bytes < 1048576) {
        return round($bytes / 1024, 2) . ' KB';
    } elseif ($bytes < 1073741824) {
        return round($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes < 1099511627776) {
        return round($bytes / 1073741824, 2) . ' GB';
    } else {
        return round($bytes / 1099511627776, 2) . ' TB';
    }
}

function list_file($path = '.')
{
    $arr_file = array();

    $ignore = array('cgi-bin', '.', '..', 'index.php', 'Thumbs.db', 'css', 'js', 'images', 'thumb', 'zip.php', 'exif.php', 'info.php', 'resource', 'dl.php', 'dir.png', 'bg.jpg', 'bg.gif');
    $db_file = array('sql', 'gz', 'tar', 'zip', 'rar', 'bz2');

    $dh = @opendir($path);
    // Open the directory to the handle $dh

    while (false !== ($file = readdir($dh))) {
        // Loop through the directory

        if (!in_array($file, $ignore)) {
            if (is_dir("$path/$file")) {
                $arr_dir[] = $file;
            } else {
                $ext = pathinfo($path . "/" . $file, PATHINFO_EXTENSION);
                if (in_array($ext, $db_file)) {
                    $arr_file[] = $file;
                }
            }
        }
    }

    closedir($dh);
    // Close the directory handle

    rsort($arr_file);
    return $arr_file;
}
