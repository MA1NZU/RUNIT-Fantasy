rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userTeams/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email == "yahyaayman2006@gmail.com";
    }
    match /players/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email == "yahyaayman2006@gmail.com";
    }
    match /playerMatchStats/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email == "yahyaayman2006@gmail.com";
    }
    match /gameweekTeams/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /settings/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email == "yahyaayman2006@gmail.com";
    }
  }
}
