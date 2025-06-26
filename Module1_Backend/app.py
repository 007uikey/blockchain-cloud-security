import io
from flask import Flask, request, jsonify, session,send_file
from pymongo import MongoClient
from flask_cors import CORS
import random
import string
from werkzeug.utils import secure_filename
import boto3
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import scrypt
import bcrypt
from datetime import datetime,timezone
from pymongo import DESCENDING
import secrets
import base64

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Allow frontend to send cookies (sessions)
app.secret_key = secrets.token_hex(16)  

client = MongoClient("mongodb://localhost:27017/")  
db = client["module1_db"]  
audit_trail_collection = db["audit_trail"] 
patient_reports = db["patient_reports"] 


# AWS S3 setup
s3_client = boto3.client('s3', aws_access_key_id='YOUR_AWS_ACCESS_KEY', aws_secret_access_key='YOUR_AWS_SECRET_KEY')
bucket_name = 'user-encrypted-data2'

role_mapping = {
    "Role 1": "Doctor",
    "Role 2": "Patient",
    "Role 3": "Lab Technician"
}


# Generate user ID
def generate_user_id(username, length=8):
    suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{username}_{suffix}"

# Generate encryption key
"""def generate_user_key(password):
    salt = get_random_bytes(16)
    key = scrypt(password.encode(), salt, key_len=32, N=2**14, r=8, p=1)
    return key, salt"""

# Password hashing
def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(stored_password, provided_password):
    return bcrypt.checkpw(provided_password.encode(), stored_password.encode())

# Mocked doctor to patient mapping
doctor_assignments = {
    'doctor1-id': ['patient1-id', 'patient2-id']
}

@app.route('/api/assigned_patients', methods=['GET'])
def get_assigned_patients():
    if 'user_id' not in session:  
        return jsonify({'error': 'Unauthorized'}), 401
    
    doctor_id = session['user_id']
    print(f"Fetching assigned patients for doctor: {doctor_id}")  
    assigned = doctor_assignments.get(doctor_id, [])
    return jsonify({'patients': assigned})

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Check if user already exists
    existing_user = db.users.find_one({"username": username})
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400

    user_id = generate_user_id(username)
    hashed_password = hash_password(password)

    # Generate salt and derive key
    salt = get_random_bytes(16)

    # Store user and salt in MongoDB
    db.users.insert_one({
        "user_id": user_id,
        "username": username,
        "hashed_password": hashed_password
    })

    db.user_keys.insert_one({
        "user_id": user_id,
        "salt": base64.b64encode(salt).decode(),
        "hashed_password": hashed_password
    })

    session['user_id'] = user_id
    return jsonify({'message': 'User registered successfully', 'user_id': user_id})

# User Login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Look up the user in MongoDB
    user = db.users.find_one({'username': username})
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    # Use 'hashed_password' field for login validation
    if verify_password(user['hashed_password'], password):
        session['user_id'] = user['user_id']  # Store the MongoDB-generated user_id
        return jsonify({'message': 'Login successful', 'user_id': user['user_id']})
    else:
        return jsonify({'error': 'Invalid username or password'}), 401



@app.route('/create_audit_log', methods=['POST'])
def create_audit_log():
    try:
       
        data = request.get_json()
        user_id = data.get('user_id')
        action = data.get('action')
        timestamp = data.get('timestamp')

        # If timestamp is not provided, generate the current timestamp
        if not timestamp:
            timestamp = datetime.now().isoformat()

        log_entry = {
            "user_id": user_id,
            "action": action,
            "timestamp": timestamp
        }

       # Insert into MongoDB
        audit_trail_collection.insert_one(log_entry)

        print(f"Audit Log: {user_id} - {action} at {timestamp}")
        return jsonify({"message": "Audit log created!", "timestamp": timestamp}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_audit_logs', methods=['GET'])
def get_audit_logs():
    try:
        # Fetch all logs from MongoDB
        logs = list(audit_trail_collection.find({}, {"_id": 0}))  # Exclude MongoDB's internal _id field

        return jsonify({"logs": logs}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_user_role', methods=['POST'])
def get_user_role():
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        # Find the latest audit log for this user where role was assigned
        log_entry = audit_trail_collection.find_one(
            {"user_id": user_id, "action": {"$regex": "Role .* assigned by Admin"}},
            sort=[("timestamp", DESCENDING)]  # get the latest entry
        )

        if not log_entry:
            return jsonify({"error": "Role not assigned yet"}), 404

        action_text = log_entry.get("action", "")
        
        # Extract "Role 1" from "Role 1 assigned by admin"
        role_key = action_text.split("assigned")[0].strip()

        role_name = role_mapping.get(role_key)

        if not role_name:
            return jsonify({"error": "Unknown role mapping"}), 400

        return jsonify({"role": role_name}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    

@app.route('/upload', methods=['POST'])
def upload_report():
    if 'file' not in request.files and not request.form.get('diagnosis') and not request.form.get('treatment'):
        return jsonify({'error': 'Missing file or diagnosis/treatment data'}), 400

    patient_id = request.form.get('patient_id')
    file = request.files.get('file')

    if not patient_id:
        return jsonify({'error': 'Missing patient ID'}), 400

    file = request.files.get('file')
    doctor_id = request.form.get('doctor_id')
    diagnosis = request.form.get('diagnosis')
    treatment = request.form.get('treatment')

    # Get user's password hash and salt from MongoDB
    user_key_entry = db.user_keys.find_one({"user_id": patient_id})
    if not user_key_entry:
        return jsonify({'error': 'Patient encryption info not found'}), 404

    try:
        salt = base64.b64decode(user_key_entry['salt'])
        pseudo_password = user_key_entry['hashed_password']
        key = scrypt(pseudo_password.encode(), salt, key_len=32, N=2**14, r=8, p=1)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Key derivation failed', 'details': str(e)}), 500

    # Process diagnosis/treatment or file data
    if file:
        # Encrypt file
        file_data = file.read()
        try:
            cipher = AES.new(key, AES.MODE_EAX)
            ciphertext, tag = cipher.encrypt_and_digest(file_data)
            encrypted_data = cipher.nonce + ciphertext

            # Upload encrypted file to S3
            s3_key = f"{patient_id}_{secure_filename(file.filename)}"
            s3_client.put_object(Bucket=bucket_name, Key=s3_key, Body=encrypted_data)

            # Save metadata in MongoDB
            patient_reports.insert_one({
                "patient_id": patient_id,
                "file_name": file.filename,
                "doctor_id": doctor_id,
                "s3_key": s3_key,
                "upload_timestamp": datetime.now(timezone.utc),
                "salt": base64.b64encode(salt).decode(),  # <- this
            })

        except Exception as e:
            print(f"Error: {e}")
            return jsonify({'error': 'File encryption or upload failed', 'details': str(e)}), 500

    elif diagnosis and treatment:
        # Combine diagnosis and treatment into one file
        report_text = f"Diagnosis: {diagnosis}\nTreatment: {treatment}"

        try:
            cipher = AES.new(key, AES.MODE_EAX)
            ciphertext, tag = cipher.encrypt_and_digest(report_text.encode('utf-8'))
            encrypted_data = cipher.nonce + ciphertext

            # Create a virtual file for the report
            s3_key = f"{patient_id}_report.txt"
            s3_client.put_object(Bucket=bucket_name, Key=s3_key, Body=encrypted_data)

            # Save metadata to MongoDB
            patient_reports.insert_one({
                "patient_id": patient_id,
                "file_name": "report.txt",
                "doctor_id": doctor_id,
                "s3_key": s3_key,
                "upload_timestamp": datetime.now(timezone.utc)
            })

        except Exception as e:
            return jsonify({'error': 'Report encryption or upload failed', 'details': str(e)}), 500

    # Log audit trail
    audit_trail_collection.insert_one({
        "patient_id": patient_id,
        "action": "Report upload",
        "timestamp": datetime.now(timezone.utc)
    })

    return jsonify({'message': 'Report uploaded and encrypted successfully'}), 200


    
# List User Files
@app.route('/get_patient_reports', methods=['POST'])
def get_patient_reports():
    data = request.json
    patient_id = data.get('patient_id')

    if not patient_id:
        return jsonify({'error': 'Missing patient ID'}), 400

    reports = list(patient_reports.find({'patient_id': patient_id}))
    report_list = []

    for idx, report in enumerate(reports, start=1):
        doctor_id = report.get("doctor_id", "Unknown")
        doctor_name = "Unknown"

        if doctor_id != "Unknown":
            doctor_info = db.users.find_one({"user_id": doctor_id})
            if doctor_info:
                doctor_name = doctor_info.get("username", "Unknown")

        upload_timestamp = report.get("upload_timestamp")
        timestamp_str = upload_timestamp.isoformat() if isinstance(upload_timestamp, datetime) else "Unknown"


        report_list.append({
            "sr_no": idx,
            "file_name": report.get("file_name", "N/A"),
            "timestamp": timestamp_str,
            "s3_key": report.get("s3_key"),
            "doctor_id": doctor_id,
            "doctor_name": doctor_name
        })

    return jsonify({'reports': report_list}), 200



@app.route('/download_report', methods=['POST'])
def download_report():
    data = request.get_json()
    patient_id = data.get('patient_id')
    s3_key = data.get('s3_key')

    if not patient_id or not s3_key:
        return jsonify({'error': 'Missing patient ID or S3 key'}), 400

    # Fetch encryption key info from user_keys
    user_key_entry = db.user_keys.find_one({"user_id": patient_id})
    if not user_key_entry:
        return jsonify({'error': 'Encryption key not found for patient'}), 404

    try:
        salt = base64.b64decode(user_key_entry['salt'])
        pseudo_password = user_key_entry['hashed_password']
        key = scrypt(pseudo_password.encode(), salt, key_len=32, N=2**14, r=8, p=1)
    except Exception as e:
        print(f"Key derivation failed: {e}")
        return jsonify({'error': 'Key derivation failed', 'details': str(e)}), 500

    try:
        # Download encrypted file from S3
        obj = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        encrypted_data = obj['Body'].read()

        nonce = encrypted_data[:16]
        ciphertext = encrypted_data[16:]

        cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
        decrypted_data = cipher.decrypt(ciphertext)

        return send_file(
            io.BytesIO(decrypted_data),
            download_name=s3_key.split('_', 1)[1],  # returns only 'report.txt' or actual filename
            as_attachment=True
        )
    except Exception as e:
        print(f"Download or decryption failed: {e}")
        return jsonify({'error': 'Download or decryption failed', 'details': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
