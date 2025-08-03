import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { UserContextProvider } from "./_lib/user.context";
import { GettingStarted } from "./_components/getting-started";
import Post from "./_components/post";
import MyClaims from "./_components/my-claims";
import ReviewClaims from "./_components/REVIEWER/review-claims";
import ClaimApproval from "./_components/ADMIN/claim-approval";
import { Persistence } from "./_lib/persistance";
import Providers from "./_lib/providers";
import { RoleValidator } from "./_lib/roleValidator";
import { UserRoles } from "./types/user";
import Footer from "./_components/footer";
import Settlement from "./_components/ADMIN/settlement";

function App() {

  return (
    <Providers>
      <UserContextProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to={'/post'} replace />} />
            {/* public routes */}
            <Route path="public" >
              <Route index path="getting-started" element={<GettingStarted />} />
            </Route>

            {/* protected routes */}
            <Route element={<Persistence />}>
              <Route path="/" element={<Footer />}>
                <Route index path="post" element={<Post />} />
                <Route path="my-claims" element={<MyClaims />} />
              </Route>

              {/* reviewer routes */}
              <Route element={<RoleValidator role={UserRoles.REVIEWER} />}>
                <Route path="review-claims" element={<ReviewClaims />} />
              </Route>

              {/* admin routes */}
              <Route element={<RoleValidator role={UserRoles.ADMIN} />}>
                <Route element={<Footer admin />}>
                  <Route path="claim-approval" element={<ClaimApproval />} />
                  <Route path="settlement" element={<Settlement />} />
                </Route>
              </Route>
            </Route>

          </Routes>
        </Router>
      </UserContextProvider>
    </Providers>
  )
}

export default App
