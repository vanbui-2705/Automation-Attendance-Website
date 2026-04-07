# Automatic Attendance Website

Ung dung web diem danh bang khuon mat voi 2 luong su dung chinh:

- Nhan vien/khach mo trang guest de quet khuon mat bang camera trinh duyet hoac tai anh len.
- Quan ly dang nhap vao trang manager de tao nhan vien, dang ky mau khuon mat va xem nhat ky diem danh.

README nay da duoc cap nhat theo kien truc hien tai cua repo. Day khong con la ung dung desktop Python cu nua.

## Tinh nang hien tai

- Guest check-in bang webcam trong trinh duyet, tu dong quet dinh ky va co fallback tai anh khi camera khong dung duoc.
- Rate limit cho endpoint guest check-in: 10 request trong 60 giay theo IP.
- Dang nhap manager bang session cookie cua Flask.
- Tao va xem danh sach nhan vien.
- Dang ky khuon mat cho nhan vien bang dung 5 anh mau.
- Kiem tra loi no face / multiple faces ngay trong qua trinh dang ky.
- Nhan dien khuon mat bang DeepFace voi model ArcFace.
- So khop embedding bang cosine distance voi nguong mac dinh `0.6`.
- Chi tao 1 ban ghi diem danh moi nhan vien trong moi ngay.
- Luu snapshot check-in de manager mo lai tu trang attendance.
- Loc lich su diem danh theo ngay va tim theo ma nhan vien / ho ten.

## Kien truc tong quan

### Frontend

- React 18
- Vite
- React Router
- Vitest + Testing Library

### Backend

- Flask 3
- Flask-SQLAlchemy
- SQLite local (`backend/data/app.db`)
- DeepFace / ArcFace
- OpenCV + NumPy

### Luu tru local

- Database: `backend/data/app.db`
- Anh check-in: `backend/data/checkins/<YYYY-MM-DD>/...`
- Anh mau khuon mat: `backend/data/faces/employee-<id>/...`

## Luong nghiep vu

1. Tao tai khoan manager.
2. Dang nhap trang `/manager/login`.
3. Tao nhan vien moi voi `employee_code` va `full_name`.
4. Tai len dung 5 anh khuon mat cho tung nhan vien.
5. Mo trang `/guest` de quet khuon mat bang camera hoac gui anh thu cong.
6. He thong trich xuat embedding, so khop voi bo mau dang hoat dong va ghi nhan check-in neu hop le.
7. Manager vao trang attendance de xem danh sach ban ghi va snapshot.

## Cau truc thu muc

```text
.
|-- backend/
|   |-- app/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- models.py
|   |   `-- config.py
|   |-- tests/
|   |-- Dockerfile
|   `-- run.py
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |-- components/
|   |   |-- context/
|   |   `-- lib/
|   |-- package.json
|   `-- vite.config.js
|-- scripts/
|   `-- create_manager.py
|-- docker-compose.yml
|-- run-local.ps1
`-- .env.example
```

## Bien moi truong

Copy `.env.example` thanh `.env`:

```powershell
Copy-Item .env.example .env
```

Noi dung hien tai:

```env
SECRET_KEY=change-me-to-a-random-string
```

`SECRET_KEY` nen duoc dat co dinh trong moi truong dev/production de session manager khong bi mat sau moi lan restart.

## Chay bang Docker Compose

Day la cach chay khop nhat voi cau hinh hien tai cua du an.

### Yeu cau

- Docker Desktop
- Docker Compose

### Khoi dong

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Sau khi chay:

- Frontend: `http://localhost:5173`
- Guest check-in: `http://localhost:5173/guest`
- Manager login: `http://localhost:5173/manager/login`
- Backend health: `http://localhost:5000/api/health`

Lan chay dau co the cham hon do container can cai dependency va tai model/cache phuc vu nhan dien.

### Tao tai khoan manager

Trong mot terminal khac:

```powershell
docker compose exec backend python scripts/create_manager.py --username admin --password abc123
```

Neu tai khoan da ton tai, script se in ra `exists:<username>`.

## Chay local khong dung Docker

Phu hop khi ban muon debug rieng tung service. Can luu y rang `frontend/vite.config.js` hien dang proxy `/api` sang `http://backend:5000`, tuong thich tot voi Docker network. Neu chay frontend truc tiep tren may, hay dam bao target proxy tro dung toi backend host ban dang dung.

### Backend

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
Copy-Item .env.example .env
python backend/run.py
```

### Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

### Script ho tro tren Windows

Repo co san `run-local.ps1` de mo backend va frontend trong 2 cua so PowerShell rieng:

```powershell
.\run-local.ps1
```

## Kiem thu

### Backend

```powershell
python -m pytest backend/tests -v
```

### Frontend

```powershell
Set-Location frontend
npm test
```

## API va hanh vi quan trong

- `POST /api/guest/checkin`
  - Nhan file `frame`
  - Tra ve cac trang thai nhu `recognized`, `already_checked_in`, `unknown`, `no_face`, `multiple_faces`, `rate_limited`
- `POST /api/manager/login`
  - Dang nhap manager
- `GET /api/manager/employees`
  - Lay danh sach nhan vien
- `POST /api/manager/employees`
  - Tao nhan vien moi
- `GET /api/manager/employees/<id>/face-samples`
  - Lay danh sach mau khuon mat da dang ky
- `POST /api/manager/employees/<id>/face-enrollment`
  - Dang ky dung 5 anh khuon mat
- `DELETE /api/manager/employees/<id>/face-samples`
  - Xoa toan bo bo mau da dang ky
- `GET /api/manager/attendance`
  - Xem lich su diem danh theo bo loc ngay / tim kiem

## Gioi han hien tai

- Moi nhan vien hien chi co luong tao/xem va dang ky/xoa bo mau khuon mat; chua co sua/xoa nhan vien tren giao dien.
- Face index duoc refresh tu du lieu luu tru trong qua trinh so khop.
- Du an hien uu tien luu tru local bang SQLite va file he thong, chua co dong bo cloud/database ngoai.
- Frontend local dev can de y cau hinh proxy `/api` neu khong chay qua Docker.

