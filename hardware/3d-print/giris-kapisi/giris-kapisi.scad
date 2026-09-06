// Koloni — Langstroth giriş kapısı (sürgülü, servo)
// OpenSCAD → STL. part: "cerceve" | "surgu" | "servo" | "montaj"

part = "montaj"; // varsayılan önizleme

// --- Langstroth uçuş deliği (mm) ---
slot_w = 39;
slot_h = 10;

// --- Çerçeve ---
frame_wall = 2.4;
frame_depth = 16;
frame_extra_w = 8;   // slot yan pay
frame_extra_h = 9;
frame_h = slot_h + frame_extra_h;

// --- Sürgü ---
slide_travel = 32;   // acik ↔ kapali kayma
slide_thick = 2.5;
slide_clear = 0.35;  // tolerans

// --- Servo SG90 ---
servo_w = 23;
servo_h = 12;
servo_d = 27;
servo_hole = 2.2;

module cerceve() {
  ow = slot_w + frame_extra_w * 2;
  oh = frame_h;
  difference() {
    cube([ow, frame_depth, oh]);
    // uçuş deliği
    translate([frame_extra_w, -0.1, frame_extra_h / 2])
      cube([slot_w, frame_depth + 0.2, slot_h]);
    // sürgü kanalı (üst)
    translate([frame_extra_w - slide_clear, frame_depth * 0.35, oh - slide_thick - 1.2])
      cube([slot_w + slide_travel + slide_clear * 2, frame_depth * 0.5, slide_thick + 1.5]);
    // IR yan kanalları (10 mm geniş yuva)
    for (x = [frame_extra_w - 3, frame_extra_w + slot_w - 7]) {
      translate([x, -0.1, 2])
        cube([10, 6, slot_h + 4]);
    }
    // montaj delikleri M3
    for (x = [6, ow - 6]) {
      translate([x, frame_depth - 4, 4])
        rotate([90, 0, 0])
          cylinder(h = 8, d = servo_hole, $fn = 16);
    }
  }
  // alt tahta hizalama dudak
  translate([frame_extra_w - 1, 0, 0])
    cube([slot_w + 2, 2, 1.2]);
}

module surgu_kapak() {
  // Kapak: soldan sağa kayarak deliği kapatır
  pw = slot_w + slide_travel;
  ph = slot_h + 2;
  cube([pw, slide_thick + 1, ph]);
  // servo kol bağlantı pimi
  translate([pw - 8, slide_thick + 1, ph / 2])
    rotate([90, 0, 0])
      cylinder(h = 3, d = 2.8, $fn = 20);
}

module servo_braket() {
  difference() {
    cube([servo_w + 6, servo_d + 4, servo_h + 4]);
    translate([3, 3, 3])
      cube([servo_w, servo_d, servo_h + 0.5]);
    // servo mil yuvası
    translate([3 + servo_w / 2, 3, 3 + servo_h / 2])
      rotate([90, 0, 0])
        cylinder(h = 6, d = 6, $fn = 24);
    // vida delikleri
    for (dx = [0, servo_w - 4]) {
      translate([3 + dx, 3 + servo_d - 2, 2])
        cylinder(h = 8, d = servo_hole, $fn = 12);
    }
  }
}

module montaj_onizleme() {
  color("DimGray") cerceve();
  color("Orange", 0.85)
    translate([frame_extra_w + slide_travel * 0.3, frame_depth * 0.38, oh - slide_thick - 1.2])
      surgu_kapak();
  color("SteelBlue")
    translate([frame_extra_w + slot_w + 2, -servo_d - 2, 2])
      servo_braket();
}

oh = frame_h;

if (part == "cerceve") {
  cerceve();
} else if (part == "surgu") {
  surgu_kapak();
} else if (part == "servo") {
  servo_braket();
} else {
  montaj_onizleme();
}
