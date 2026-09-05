/* ============================================================
   FOB COMMUNITY :: ROOM RECOMMENDATION HOOKS
   Loads the onboarding interests already stored for a member and
   exposes the future room-ranking boundary without changing the
   current room list or inventing recommendation rules.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  function loadRecommendationContext(userId) {
    return Promise.all([
      FOB.supabase.from('user_interests').select('interest_id').eq('user_id', userId),
      FOB.supabase.from('user_sports').select('sport_id, is_primary').eq('user_id', userId)
    ]).then(function (results) {
      if (results[0].error) throw results[0].error;
      if (results[1].error) throw results[1].error;
      return {
        interestIds: (results[0].data || []).map(function (row) { return row.interest_id; }),
        sports: results[1].data || []
      };
    });
  }

  function recommendRooms(context, categories) {
    void context;
    void categories;
    // TODO: Rank existing categories from onboarding interests and sports.
    // TODO: Return category objects only; rendering remains owned by the Rooms view.
    return [];
  }

  FOB.loadRecommendedRooms = function (userId, categories) {
    return loadRecommendationContext(userId)
      .then(function (context) { return recommendRooms(context, categories); });
  };

  FOB.roomRecommendationHooks = {
    loadContext: loadRecommendationContext,
    recommend: recommendRooms
  };
})();
